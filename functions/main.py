import os
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from firebase_functions import https_fn, scheduler_fn
from firebase_functions.options import MemoryOption

from scraper.players import PLAYERS
from scraper.scrape import fetch_games_for_player
from scraper.stats import compute_player_stats, compute_group_stats
from scraper.records import update_records
from scraper.match_scraper import scrape_match
from scraper.firebase_client import (
    _init_app,
    write_to_firebase,
    read_records,
    write_records,
    read_cached_match_ids,
    write_match,
    read_player_games,
    read_player_stats,
    patch_player,
    write_group,
    read_manual_fetch_time,
    write_manual_fetch_time,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("DB_URL", "")
COOLDOWN_SECONDS = 300  # 5 minutes


def find_new_games(page1_games: list[dict], existing_games: list[dict] | dict) -> list[dict]:
    """Return games from page1_games whose matchId is not already in existing_games.

    Handles edge case where Firebase Realtime DB returns existing_games as a dict
    (e.g., {"0": {...}, "1": {...}}) instead of a list by converting to list of values.
    """
    # Convert existing_games to list if it's a dict (Firebase edge case)
    if isinstance(existing_games, dict):
        existing_games = list(existing_games.values())

    existing_ids = {g["matchId"] for g in existing_games if g.get("matchId")}
    return [g for g in page1_games if g.get("matchId") and g["matchId"] not in existing_ids]


@scheduler_fn.on_schedule(
    schedule="every 20 minutes",
    memory=MemoryOption.MB_512,
    timeout_sec=300,
    secrets=["DB_URL"],
)
def scheduled_fetch(event: scheduler_fn.ScheduledEvent) -> None:
    """Full scrape — identical to scraper/main.py."""
    db_url = os.environ.get("DB_URL", "")
    _init_app(db_url)

    all_player_data = []
    for player in PLAYERS:
        log.info(f"Scraping {player['displayName']} ({player['url']})")
        try:
            games, rank, mastery = fetch_games_for_player(player["url"], target=30)
            stats = compute_player_stats(games)
            mastery_pts = mastery.get(stats["mostPlayedChampion"])
            if mastery_pts is not None:
                stats["mostPlayedChampionMastery"] = mastery_pts
            all_player_data.append({
                **player,
                "games": games,
                "stats": stats,
                "soloRank": rank,
            })
            rank_str = (
                " ".join(p for p in [rank["tier"], rank["division"], f"{rank['lp']} LP"] if p)
                if rank else "unranked"
            )
            log.info(f"  → {len(games)} games, {stats['wins']}W {stats['losses']}L, {rank_str}")
        except Exception as e:
            log.warning(f"  → Failed to scrape {player['displayName']}: {e}")
            all_player_data.append({
                **player,
                "games": [],
                "stats": compute_player_stats([]),
                "soloRank": None,
            })
        time.sleep(1)

    group = compute_group_stats([p["stats"] for p in all_player_data])
    log.info(f"Group: {group['totalWins']}W {group['totalLosses']}L ({group['winRate']:.1%})")
    write_to_firebase(all_player_data, group, db_url)

    existing_records = read_records(db_url)
    new_records = update_records(all_player_data, existing_records)
    if new_records is not None:
        write_records(new_records, db_url)

    all_match_ids = {
        g["matchId"]
        for p in all_player_data
        for g in p["games"]
        if g.get("matchId")
    }
    cached_ids = read_cached_match_ids(db_url)
    new_ids = sorted(all_match_ids - cached_ids)[:30]
    log.info(f"Fetching {len(new_ids)} new match details.")
    for match_id in new_ids:
        try:
            match_data = scrape_match(match_id)
            write_match(match_data, db_url)
        except Exception as e:
            log.warning(f"  → Failed to fetch match {match_id}: {e}")
        time.sleep(0.5)


def _seconds_since(iso_timestamp: str | None) -> float:
    """Return seconds elapsed since the given ISO timestamp, or a large value if None."""
    if iso_timestamp is None:
        return float("inf")
    then = datetime.fromisoformat(iso_timestamp)
    if then.tzinfo is None:
        then = then.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - then).total_seconds()


@https_fn.on_call(
    timeout_sec=60,
    memory=MemoryOption.MB_512,
    secrets=["DB_URL"],
)
def quick_fetch(req: https_fn.CallableRequest) -> dict:
    """Incremental fetch: page 1 per player in parallel, writes only new games."""
    db_url = os.environ.get("DB_URL", "")
    _init_app(db_url)

    # Enforce cooldown
    last_fetch_ts = read_manual_fetch_time(db_url)
    elapsed = _seconds_since(last_fetch_ts)
    remaining = COOLDOWN_SECONDS - elapsed  # keep as float; -inf > 0 is False, safe
    if remaining > 0:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.RESOURCE_EXHAUSTED,
            message="cooldown",
            details={"cooldownSeconds": int(remaining)},  # only cast to int here, where we know it's finite
        )

    # Fetch page 1 per player in parallel
    def fetch_player(player):
        try:
            games, rank, mastery = fetch_games_for_player(player["url"], target=10)
            return {"player": player, "games": games, "rank": rank, "mastery": mastery}
        except Exception as e:
            log.warning(f"quickFetch: failed to scrape {player['displayName']}: {e}")
            return {"player": player, "games": [], "rank": None, "mastery": {}}

    with ThreadPoolExecutor(max_workers=len(PLAYERS)) as executor:
        results = list(executor.map(fetch_player, PLAYERS))

    total_new = 0
    updated_player_data = []  # for records check
    all_stats = {}

    for result in results:
        player = result["player"]
        pid = player["id"]

        existing_games = read_player_games(pid, db_url)
        if isinstance(existing_games, dict):
            existing_games = list(existing_games.values())
        new_games = find_new_games(result["games"], existing_games)

        if new_games:
            merged = new_games + existing_games  # already a list
            stats = compute_player_stats(merged)
            mastery_pts = result["mastery"].get(stats["mostPlayedChampion"])
            if mastery_pts is not None:
                stats["mostPlayedChampionMastery"] = mastery_pts

            patch_player(pid, {
                "games": merged,
                "stats": stats,
                "soloRank": result["rank"],
            }, db_url)

            all_stats[pid] = stats
            total_new += len(new_games)
            updated_player_data.append({**player, "games": merged, "stats": stats})
            log.info(f"quickFetch: {player['displayName']} +{len(new_games)} new games")
        else:
            existing_stats = read_player_stats(pid, db_url)
            if existing_stats:
                all_stats[pid] = existing_stats

    group = compute_group_stats(list(all_stats.values()))
    write_group(group, db_url)

    if updated_player_data:
        existing_records = read_records(db_url)
        new_records = update_records(updated_player_data, existing_records)
        if new_records is not None:
            write_records(new_records, db_url)

    write_manual_fetch_time(db_url)
    log.info(f"quickFetch complete: {total_new} new games total.")
    return {"newGames": total_new}
