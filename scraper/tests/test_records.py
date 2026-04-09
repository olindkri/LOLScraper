import pytest
from records import (
    compute_best_winrate,
    compute_lowest_winrate,
    compute_win_streak,
    rank_score,
    update_records,
)


# ── compute_win_streak ──────────────────────────────────────────────────────

def test_win_streak_all_wins():
    games = [{"result": "win"}] * 5
    assert compute_win_streak(games) == 5


def test_win_streak_starts_with_loss():
    games = [{"result": "loss"}, {"result": "win"}, {"result": "win"}]
    assert compute_win_streak(games) == 2


def test_win_streak_best_not_at_front():
    games = [
        {"result": "loss"},
        {"result": "win"},
        {"result": "win"},
        {"result": "win"},
        {"result": "win"},
        {"result": "loss"},
        {"result": "win"},
    ]
    assert compute_win_streak(games) == 4


def test_win_streak_mixed():
    games = [
        {"result": "win"},
        {"result": "win"},
        {"result": "win"},
        {"result": "loss"},
        {"result": "win"},
    ]
    assert compute_win_streak(games) == 3


def test_win_streak_empty():
    assert compute_win_streak([]) == 0


def test_win_streak_single_win():
    assert compute_win_streak([{"result": "win"}]) == 1


def test_win_streak_single_loss():
    assert compute_win_streak([{"result": "loss"}]) == 0


# ── update_records ──────────────────────────────────────────────────────────

PLAYER_A = {
    "id": "oliver",
    "displayName": "Oliver",
    "games": [{"result": "win"}] * 8,
    "stats": {"avgKda": 5.5},
}

PLAYER_B = {
    "id": "eirik",
    "displayName": "Eirik",
    "games": [{"result": "win"}] * 4 + [{"result": "loss"}],
    "stats": {"avgKda": 3.2},
}


def test_update_records_first_run_no_existing():
    result = update_records([PLAYER_A, PLAYER_B], {})
    assert result["bestWinStreak"]["playerId"] == "oliver"
    assert result["bestWinStreak"]["value"] == 8
    assert result["bestKda"]["playerId"] == "oliver"
    assert result["bestKda"]["value"] == 5.5


def test_update_records_beats_existing_streak():
    existing = {
        "bestWinStreak": {"playerId": "eirik", "displayName": "Eirik", "value": 6, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "eirik", "displayName": "Eirik", "value": 9.0, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_A, PLAYER_B], existing)
    assert result["bestWinStreak"]["playerId"] == "oliver"
    assert result["bestWinStreak"]["value"] == 8
    # KDA not beaten — existing preserved
    assert result["bestKda"]["value"] == 9.0


def test_update_records_no_change_returns_none():
    existing = {
        "bestWinStreak": {"playerId": "oliver", "displayName": "Oliver", "value": 20, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "oliver", "displayName": "Oliver", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_A, PLAYER_B], existing)
    assert result is None


def test_update_records_tie_does_not_replace():
    existing = {
        "bestWinStreak": {"playerId": "eirik", "displayName": "Eirik", "value": 8, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "eirik", "displayName": "Eirik", "value": 5.5, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_A, PLAYER_B], existing)
    assert result is None


def test_update_records_skips_empty_games():
    empty_player = {"id": "ghost", "displayName": "Ghost", "games": [], "stats": {"avgKda": 0.0}}
    existing = {
        "bestWinStreak": {"playerId": "oliver", "displayName": "Oliver", "value": 8, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "oliver", "displayName": "Oliver", "value": 5.5, "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([empty_player], existing)
    assert result is None


# ── compute_best_winrate ─────────────────────────────────────────────────────

def test_best_winrate_fewer_than_30_games_returns_none():
    games = [{"result": "win"}] * 29
    assert compute_best_winrate(games) is None


def test_best_winrate_exactly_30_all_wins():
    games = [{"result": "win"}] * 30
    assert compute_best_winrate(games) == 1.0


def test_best_winrate_exactly_30_mixed():
    games = [{"result": "win"}] * 24 + [{"result": "loss"}] * 6
    assert compute_best_winrate(games) == pytest.approx(24 / 30)


def test_best_winrate_finds_best_window():
    # 31 games. Window [0:30]: 1 loss + 24 wins + 5 losses = 24/30.
    # Window [1:31]: 24 wins + 5 losses + 1 win = 25/30. Best = 25/30.
    games = (
        [{"result": "loss"}]
        + [{"result": "win"}] * 24
        + [{"result": "loss"}] * 5
        + [{"result": "win"}]
    )
    assert compute_best_winrate(games) == pytest.approx(25 / 30)


def test_best_winrate_empty():
    assert compute_best_winrate([]) is None


# ── compute_lowest_winrate ───────────────────────────────────────────────────

def test_lowest_winrate_fewer_than_30_games_returns_none():
    games = [{"result": "loss"}] * 29
    assert compute_lowest_winrate(games) is None


def test_lowest_winrate_exactly_30_all_losses():
    games = [{"result": "loss"}] * 30
    assert compute_lowest_winrate(games) == 0.0


def test_lowest_winrate_exactly_30_mixed():
    games = [{"result": "win"}] * 6 + [{"result": "loss"}] * 24
    assert compute_lowest_winrate(games) == pytest.approx(6 / 30)


def test_lowest_winrate_finds_worst_window():
    # Window [0:30] = 6 wins, 24 losses. Window [1:31] = 5 wins, 25 losses.
    games = (
        [{"result": "win"}]
        + [{"result": "loss"}] * 24
        + [{"result": "win"}] * 5
        + [{"result": "loss"}]
    )
    assert compute_lowest_winrate(games) == pytest.approx(5 / 30)


def test_lowest_winrate_empty():
    assert compute_lowest_winrate([]) is None


# ── rank_score ───────────────────────────────────────────────────────────────

def test_rank_score_diamond_one():
    assert rank_score("diamond", "I", 92) == 7 * 10000 + 4 * 100 + 92


def test_rank_score_platinum_two():
    assert rank_score("platinum", "II", 75) == 5 * 10000 + 3 * 100 + 75


def test_rank_score_diamond_beats_platinum():
    assert rank_score("diamond", "IV", 0) > rank_score("platinum", "I", 100)


def test_rank_score_higher_division_beats_lower():
    assert rank_score("gold", "I", 0) > rank_score("gold", "II", 99)


def test_rank_score_higher_lp_breaks_tie():
    assert rank_score("gold", "I", 80) > rank_score("gold", "I", 50)


def test_rank_score_master_no_division():
    # Master/Grandmaster/Challenger: division ignored, just LP
    assert rank_score("master", None, 500) == 8 * 10000 + 4 * 100 + 500


def test_rank_score_master_beats_diamond():
    assert rank_score("master", None, 0) > rank_score("diamond", "I", 100)


# ── update_records — bestWinRate and highestRank ─────────────────────────────

# 30 games: 25 wins, 5 losses → best window = 25/30
_GAMES_30 = [{"result": "win"}] * 25 + [{"result": "loss"}] * 5

PLAYER_WITH_RANK = {
    "id": "oliver",
    "displayName": "Oliver",
    "games": _GAMES_30,
    "stats": {"avgKda": 5.5},
    "soloRank": {"tier": "diamond", "division": "I", "lp": 92},
}

PLAYER_WITH_LOWER_RANK = {
    "id": "eirik",
    "displayName": "Eirik",
    "games": _GAMES_30,
    "stats": {"avgKda": 3.2},
    "soloRank": {"tier": "platinum", "division": "II", "lp": 75},
}


def test_update_records_sets_best_winrate_on_first_run():
    result = update_records([PLAYER_WITH_RANK], {})
    assert result["bestWinRate"]["value"] == pytest.approx(25 / 30)
    assert result["bestWinRate"]["playerId"] == "oliver"


def test_update_records_sets_highest_rank_on_first_run():
    result = update_records([PLAYER_WITH_RANK], {})
    assert result["highestRank"]["tier"] == "diamond"
    assert result["highestRank"]["division"] == "I"
    assert result["highestRank"]["lp"] == 92
    assert result["highestRank"]["value"] == "Diamond I 92LP"
    assert result["highestRank"]["playerId"] == "oliver"


def test_update_records_picks_highest_rank_across_players():
    result = update_records([PLAYER_WITH_LOWER_RANK, PLAYER_WITH_RANK], {})
    assert result["highestRank"]["playerId"] == "oliver"


def test_update_records_winrate_beats_existing():
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 0.5, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "gold", "division": "I", "lp": 99, "value": "Gold I 99LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_WITH_RANK], existing)
    assert result["bestWinRate"]["value"] == pytest.approx(25 / 30)
    assert result["bestWinRate"]["playerId"] == "oliver"


def test_update_records_winrate_tie_does_not_replace():
    existing_rate = 25 / 30
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": existing_rate, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "master", "division": None, "lp": 999, "value": "Master 999LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_WITH_RANK], existing)
    assert result is None


def test_update_records_rank_beats_existing():
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 1.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "platinum", "division": "I", "lp": 99, "value": "Platinum I 99LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([PLAYER_WITH_RANK], existing)
    assert result["highestRank"]["playerId"] == "oliver"
    assert result["highestRank"]["value"] == "Diamond I 92LP"


def test_update_records_no_solorank_skips_rank_check():
    player_no_rank = {
        "id": "ghost",
        "displayName": "Ghost",
        "games": _GAMES_30,
        "stats": {"avgKda": 5.5},
        # no soloRank key
    }
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 1.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "master", "division": None, "lp": 999, "value": "Master 999LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([player_no_rank], existing)
    assert result is None


def test_update_records_fewer_than_30_games_skips_winrate():
    player_few_games = {
        "id": "rookie",
        "displayName": "Rookie",
        "games": [{"result": "win"}] * 10,
        "stats": {"avgKda": 5.5},
        "soloRank": {"tier": "master", "division": None, "lp": 9999},
    }
    existing = {
        "bestWinStreak": {"playerId": "x", "displayName": "X", "value": 99, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestKda": {"playerId": "x", "displayName": "X", "value": 99.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "bestWinRate": {"playerId": "x", "displayName": "X", "value": 1.0, "achievedAt": "2026-01-01T00:00:00Z"},
        "highestRank": {"playerId": "x", "displayName": "X", "tier": "gold", "division": "I", "lp": 0, "value": "Gold I 0LP", "achievedAt": "2026-01-01T00:00:00Z"},
    }
    result = update_records([player_few_games], existing)
    # highestRank is beaten (master > gold) but winrate is not (< 30 games)
    assert result["highestRank"]["playerId"] == "rookie"
    assert result["bestWinRate"]["value"] == 1.0  # unchanged
