import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from main import find_new_games


def _game(match_id, result="win"):
    return {"matchId": match_id, "result": result, "champion": "Ahri",
            "kills": 5, "deaths": 2, "assists": 7, "cs": 180,
            "duration": "30min", "queue": "Ranked Solo/Duo", "lpDelta": 18}


def test_all_new_when_existing_is_empty():
    page1 = [_game("1"), _game("2"), _game("3")]
    assert find_new_games(page1, []) == page1


def test_no_new_when_all_already_in_firebase():
    page1 = [_game("1"), _game("2")]
    existing = [_game("1"), _game("2"), _game("3")]
    assert find_new_games(page1, existing) == []


def test_returns_only_games_not_in_existing():
    page1 = [_game("3"), _game("4"), _game("1")]
    existing = [_game("1"), _game("2")]
    result = find_new_games(page1, existing)
    assert len(result) == 2
    assert {g["matchId"] for g in result} == {"3", "4"}


def test_games_without_match_id_are_excluded():
    page1 = [{"matchId": None, "result": "win"}, _game("5")]
    assert find_new_games(page1, []) == [_game("5")]


def test_preserves_order_of_page1():
    page1 = [_game("10"), _game("11"), _game("12")]
    result = find_new_games(page1, [])
    assert [g["matchId"] for g in result] == ["10", "11", "12"]


def test_existing_games_as_dict_converted_to_list():
    """Firebase Realtime DB may return games as a dict instead of list."""
    page1 = [_game("5"), _game("6")]
    existing_dict = {
        "0": _game("1"),
        "1": _game("2"),
        "2": _game("5")
    }
    result = find_new_games(page1, existing_dict)
    assert len(result) == 1
    assert result[0]["matchId"] == "6"
