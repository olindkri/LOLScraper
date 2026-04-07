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
            "profileUrl": p["url"],
            "games": p["games"],
            "stats": p["stats"],
        }
    return {"players": players_data, "group": group}


def write_to_firebase(players: list[dict], group: dict, database_url: str) -> None:
    _init_app(database_url)
    payload = build_payload(players, group)
    db.reference("/").update(payload)
