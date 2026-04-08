from records import compute_win_streak, update_records


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
