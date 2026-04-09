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


def compute_lowest_winrate(games: list[dict]) -> float | None:
    if len(games) < 30:
        return None
    lowest = 1.0
    for i in range(len(games) - 29):
        window = games[i : i + 30]
        wins = sum(1 for g in window if g["result"] == "win")
        lowest = min(lowest, wins / 30)
    return lowest


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
    best_winrate_value = existing.get("bestWinRate", {}).get("value", -1.0)
    lowest_winrate_value = existing.get("lowestWinRate", {}).get("value", 2.0)

    existing_rank = existing.get("highestRank", {})
    best_rank_score = (
        rank_score(existing_rank["tier"], existing_rank.get("division"), existing_rank["lp"])
        if existing_rank
        else -1
    )

    new_streak = dict(existing.get("bestWinStreak", {}))
    new_kda = dict(existing.get("bestKda", {}))
    new_winrate = dict(existing.get("bestWinRate", {}))
    new_lowest_winrate = dict(existing.get("lowestWinRate", {}))
    new_rank = dict(existing.get("highestRank", {}))

    streak_beaten = False
    kda_beaten = False
    winrate_beaten = False
    lowest_winrate_beaten = False
    rank_beaten = False

    for p in all_player_data:
        if not p.get("games"):
            continue

        streak = compute_win_streak(p["games"])
        kda = p["stats"]["avgKda"]
        winrate = compute_best_winrate(p["games"])
        lowest_winrate = compute_lowest_winrate(p["games"])
        solo_rank = p.get("soloRank")

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

        if winrate is not None and winrate > best_winrate_value:
            best_winrate_value = winrate
            new_winrate = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": winrate,
                "achievedAt": _now(),
            }
            winrate_beaten = True

        if lowest_winrate is not None and lowest_winrate < lowest_winrate_value:
            lowest_winrate_value = lowest_winrate
            new_lowest_winrate = {
                "playerId": p["id"],
                "displayName": p["displayName"],
                "value": lowest_winrate,
                "achievedAt": _now(),
            }
            lowest_winrate_beaten = True

        if solo_rank:
            score = rank_score(solo_rank["tier"], solo_rank.get("division"), solo_rank["lp"])
            if score > best_rank_score:
                best_rank_score = score
                new_rank = {
                    "playerId": p["id"],
                    "displayName": p["displayName"],
                    "tier": solo_rank["tier"],
                    "division": solo_rank.get("division"),
                    "lp": solo_rank["lp"],
                    "value": _format_rank(solo_rank["tier"], solo_rank.get("division"), solo_rank["lp"]),
                    "achievedAt": _now(),
                }
                rank_beaten = True

    if not any([streak_beaten, kda_beaten, winrate_beaten, lowest_winrate_beaten, rank_beaten]):
        return None

    return {
        "bestWinStreak": new_streak,
        "bestKda": new_kda,
        "bestWinRate": new_winrate,
        "lowestWinRate": new_lowest_winrate,
        "highestRank": new_rank,
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
