import pytest
from records import compute_win_streak, update_records, compute_best_winrate, rank_score


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
