import os
import sys
import time
import logging
from players import PLAYERS
from scrape import fetch_games_for_player
from stats import compute_player_stats, compute_group_stats
from records import update_records
from match_scraper import scrape_match
from firebase_client import write_to_firebase, read_records, write_records, read_cached_match_ids, write_match

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

DATABASE_URL = os.environ.get("FIREBASE_DATABASE_URL", "")


def run():
    if not DATABASE_URL:
        log.error("FIREBASE_DATABASE_URL environment variable is not set.")
        sys.exit(1)

    all_player_data = []
    for player in PLAYERS:
        log.info(f"Scraping {player['displayName']} ({player['url']})")
        try:
            games = fetch_games_for_player(player["url"])
            stats = compute_player_stats(games)
            all_player_data.append({
                **player,
                "games": games,
                "stats": stats,
            })
            log.info(f"  → {len(games)} ranked games, {stats['wins']}W {stats['losses']}L")
        except Exception as e:
            log.warning(f"  → Failed to scrape {player['displayName']}: {e}")
            all_player_data.append({
                **player,
                "games": [],
                "stats": compute_player_stats([]),
            })
        time.sleep(1)

    group = compute_group_stats([p["stats"] for p in all_player_data])
    log.info(f"Group: {group['totalWins']}W {group['totalLosses']}L ({group['winRate']:.1%})")

    write_to_firebase(all_player_data, group, DATABASE_URL)
    log.info("Data written to Firebase successfully.")

    # Records
    existing_records = read_records(DATABASE_URL)
    new_records = update_records(all_player_data, existing_records)
    if new_records is not None:
        write_records(new_records, DATABASE_URL)
        streak = new_records.get("bestWinStreak", {})
        kda = new_records.get("bestKda", {})
        if streak:
            log.info(f"  🏆 New streak record: {streak['displayName']} — {streak['value']} wins")
        if kda:
            log.info(f"  ⚡ New KDA record: {kda['displayName']} — {kda['value']}")
    else:
        log.info("Records unchanged.")

    # Match details
    all_match_ids = {
        g["matchId"]
        for p in all_player_data
        for g in p["games"]
        if g.get("matchId")
    }
    cached_ids = read_cached_match_ids(DATABASE_URL)
    new_ids = sorted(all_match_ids - cached_ids)[:30]
    log.info(f"Fetching {len(new_ids)} new matches ({len(cached_ids)} already cached).")
    for match_id in new_ids:
        try:
            match_data = scrape_match(match_id)
            write_match(match_data, DATABASE_URL)
            log.info(f"  → Cached match {match_id} ({len(match_data['participants'])} participants)")
        except Exception as e:
            log.warning(f"  → Failed to fetch match {match_id}: {e}")
        time.sleep(0.5)


if __name__ == "__main__":
    run()
