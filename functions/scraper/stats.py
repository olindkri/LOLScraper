from collections import Counter
from datetime import datetime, timezone


def compute_player_stats(games: list[dict]) -> dict:
    if not games:
        return {
            "wins": 0,
            "losses": 0,
            "winRate": 0.0,
            "avgKda": 0.0,
            "avgCs": 0,
            "mostPlayedChampion": "",
        }

    wins = sum(1 for g in games if g["result"] == "win")
    losses = len(games) - wins

    total_kills = sum(g["kills"] for g in games)
    total_deaths = sum(g["deaths"] for g in games)
    total_assists = sum(g["assists"] for g in games)
    avg_kda = round((total_kills + total_assists) / max(total_deaths, 1), 2)

    avg_cs = round(sum(g["cs"] for g in games) / len(games))

    champion_counts = Counter(g["champion"] for g in games if g.get("champion"))
    most_played = champion_counts.most_common(1)[0][0] if champion_counts else ""

    return {
        "wins": wins,
        "losses": losses,
        "winRate": round(wins / len(games), 4),
        "avgKda": avg_kda,
        "avgCs": avg_cs,
        "mostPlayedChampion": most_played,
    }


def compute_group_stats(player_stats_list: list[dict]) -> dict:
    if not player_stats_list:
        return {"totalWins": 0, "totalLosses": 0, "winRate": 0.0, "lastUpdated": _now()}

    total_wins = sum(p["wins"] for p in player_stats_list)
    total_losses = sum(p["losses"] for p in player_stats_list)
    total_games = total_wins + total_losses

    return {
        "totalWins": total_wins,
        "totalLosses": total_losses,
        "winRate": round(total_wins / max(total_games, 1), 4),
        "lastUpdated": _now(),
    }


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()
