import json
import os
import firebase_admin
from firebase_admin import credentials, db

_app = None


def _init_app(database_url: str) -> None:
    global _app
    if _app is not None:
        return
    cred_json = json.loads(os.environ["FIREBASE_CREDENTIALS"])
    cred = credentials.Certificate(cred_json)
    _app = firebase_admin.initialize_app(cred, {"databaseURL": database_url})


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
