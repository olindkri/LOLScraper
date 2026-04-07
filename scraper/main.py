import os
import sys
import time
import logging
from players import PLAYERS
from scrape import fetch_page, parse_games
from stats import compute_player_stats, compute_group_stats
from firebase_client import write_to_firebase

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
            soup = fetch_page(player["url"])
            games = parse_games(soup)
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


if __name__ == "__main__":
    run()
