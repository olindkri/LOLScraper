import json
import os
from datetime import datetime, timezone

import firebase_admin
from firebase_admin import credentials, db

_app = None


def _init_app(database_url: str) -> None:
    global _app
    if _app is not None:
        return
    cred_env = os.environ.get("FIREBASE_CREDENTIALS")
    if cred_env:
        cred_json = json.loads(cred_env)
        cred = credentials.Certificate(cred_json)
        _app = firebase_admin.initialize_app(cred, {"databaseURL": database_url})
    else:
        # Application Default Credentials — used when running on Google Cloud
        _app = firebase_admin.initialize_app(options={"databaseURL": database_url})


def build_payload(players: list[dict], group: dict) -> dict:
    players_data = {}
    for p in players:
        players_data[p["id"]] = {
            "displayName": p["displayName"],
            "gamertag": p["gamertag"],
            "profileUrl": p["url"],
            "games": p["games"],
            "stats": p["stats"],
            "soloRank": p.get("soloRank"),
        }
    return {"players": players_data, "group": group}


def write_to_firebase(players: list[dict], group: dict, database_url: str) -> None:
    _init_app(database_url)
    payload = build_payload(players, group)
    db.reference("/").update(payload)


def read_records(database_url: str) -> dict:
    _init_app(database_url)
    data = db.reference("/records").get()
    return data if data is not None else {}


def write_records(records: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference("/records").set(records)


def read_cached_match_ids(database_url: str) -> set:
    _init_app(database_url)
    data = db.reference("/matches").get()
    if not data:
        return set()
    return set(data.keys())


def write_match(match_data: dict, database_url: str) -> None:
    _init_app(database_url)
    match_id = match_data["matchId"]
    db.reference(f"/matches/{match_id}").set(match_data)


# ── New helpers for quickFetch ──────────────────────────────────────────────

def read_player_games(player_id: str, database_url: str) -> list:
    _init_app(database_url)
    data = db.reference(f"/players/{player_id}/games").get()
    return data if data is not None else []


def read_player_stats(player_id: str, database_url: str) -> dict | None:
    _init_app(database_url)
    return db.reference(f"/players/{player_id}/stats").get()


def patch_player(player_id: str, data: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference(f"/players/{player_id}").update(data)


def write_group(group: dict, database_url: str) -> None:
    _init_app(database_url)
    db.reference("/group").set(group)


def read_manual_fetch_time(database_url: str) -> str | None:
    _init_app(database_url)
    return db.reference("/metadata/lastManualFetch").get()


def write_manual_fetch_time(database_url: str) -> None:
    _init_app(database_url)
    ts = datetime.now(timezone.utc).isoformat()
    db.reference("/metadata/lastManualFetch").set(ts)
