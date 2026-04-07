from stats import compute_player_stats, compute_group_stats

SAMPLE_GAMES = [
    {"result": "win",  "kills": 8, "deaths": 2, "assists": 10, "cs": 200, "champion": "Jinx"},
    {"result": "loss", "kills": 3, "deaths": 5, "assists": 4,  "cs": 150, "champion": "Lux"},
    {"result": "win",  "kills": 6, "deaths": 1, "assists": 8,  "cs": 220, "champion": "Jinx"},
    {"result": "win",  "kills": 9, "deaths": 3, "assists": 12, "cs": 190, "champion": "Jinx"},
    {"result": "loss", "kills": 2, "deaths": 6, "assists": 3,  "cs": 130, "champion": "Lux"},
]


def test_player_stats_wins_losses():
    stats = compute_player_stats(SAMPLE_GAMES)
    assert stats["wins"] == 3
    assert stats["losses"] == 2


def test_player_stats_win_rate():
    stats = compute_player_stats(SAMPLE_GAMES)
    assert stats["winRate"] == 0.6


def test_player_stats_avg_kda():
    stats = compute_player_stats(SAMPLE_GAMES)
    # kills: 28, deaths: 17, assists: 37 → KDA = (28 + 37) / 17 ≈ 3.82
    assert abs(stats["avgKda"] - round((28 + 37) / 17, 2)) < 0.01


def test_player_stats_most_played_champion():
    stats = compute_player_stats(SAMPLE_GAMES)
    assert stats["mostPlayedChampion"] == "Jinx"


def test_player_stats_empty_games():
    stats = compute_player_stats([])
    assert stats["wins"] == 0
    assert stats["losses"] == 0
    assert stats["winRate"] == 0.0


def test_group_stats_totals():
    player_stats_list = [
        {"wins": 7, "losses": 3},
        {"wins": 5, "losses": 5},
        {"wins": 6, "losses": 4},
    ]
    group = compute_group_stats(player_stats_list)
    assert group["totalWins"] == 18
    assert group["totalLosses"] == 12
    assert group["winRate"] == 0.6


def test_group_stats_zero_games():
    group = compute_group_stats([])
    assert group["winRate"] == 0.0
