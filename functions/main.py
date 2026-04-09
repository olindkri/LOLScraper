import os
import time
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

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
