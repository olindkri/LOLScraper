from datetime import datetime, timezone


def compute_win_streak(games: list[dict]) -> int:
    max_streak = 0
    current = 0
    for game in games:
        if game["result"] == "win":
            current += 1
            max_streak = max(max_streak, current)
        else:
            current = 0
    return max_streak


def update_records(all_player_data: list[dict], existing: dict) -> dict | None:
    best_streak_value = existing.get("bestWinStreak", {}).get("value", -1)
    best_kda_value = existing.get("bestKda", {}).get("value", -1)

    new_streak = dict(existing.get("bestWinStreak", {}))
    new_kda = dict(existing.get("bestKda", {}))

    streak_beaten = False
    kda_beaten = False

    for p in all_player_data:
        if not p.get("games"):
            continue

        streak = compute_win_streak(p["games"])
        kda = p["stats"]["avgKda"]

        if streak > best_streak_value:
            best_streak_value = streak
            new_streak = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": streak,
                "achievedAt": _now(),
            }
            streak_beaten = True

        if kda > best_kda_value:
            best_kda_value = kda
            new_kda = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": kda,
                "achievedAt": _now(),
            }
            kda_beaten = True

    if not streak_beaten and not kda_beaten:
        return None

    return {"bestWinStreak": new_streak, "bestKda": new_kda}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
