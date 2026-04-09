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

DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")
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
    secrets=["FIREBASE_DATABASE_URL"],
)
def scheduled_fetch(event: scheduler_fn.ScheduledEvent) -> None:
    """Full scrape — identical to scraper/main.py."""
    db_url = os.environ.get("FIREBASE_DATABASE_URL", "")
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
