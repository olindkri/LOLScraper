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


_TIER_SCORES = {
    "iron": 1, "bronze": 2, "silver": 3, "gold": 4,
    "platinum": 5, "emerald": 6, "diamond": 7,
    "master": 8, "grandmaster": 9, "challenger": 10,
}
_DIVISION_SCORES = {"IV": 1, "III": 2, "II": 3, "I": 4}
_NO_DIVISION_TIERS = {"master", "grandmaster", "challenger"}


def compute_best_winrate(games: list[dict]) -> float | None:
    if len(games) < 30:
        return None
    best = 0.0
    for i in range(len(games) - 29):
        window = games[i : i + 30]
        wins = sum(1 for g in window if g["result"] == "win")
        best = max(best, wins / 30)
    return best


def rank_score(tier: str, division: str | None, lp: int) -> int:
    t = _TIER_SCORES.get((tier or "").lower(), 0)
    d = 4 if (tier or "").lower() in _NO_DIVISION_TIERS else _DIVISION_SCORES.get(division or "", 0)
    return t * 10000 + d * 100 + lp


def _format_rank(tier: str, division: str | None, lp: int) -> str:
    tier_cap = tier.capitalize()
    if tier.lower() in _NO_DIVISION_TIERS:
        return f"{tier_cap} {lp}LP"
    return f"{tier_cap} {division or ''} {lp}LP"


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
