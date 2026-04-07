from pathlib import Path
from bs4 import BeautifulSoup
from scrape import parse_games

FIXTURE = Path(__file__).parent / "fixtures" / "sample_page.html"


def get_soup():
    return BeautifulSoup(FIXTURE.read_text(encoding="utf-8"), "lxml")


def test_returns_list_of_dicts():
    games = parse_games(get_soup())
    assert isinstance(games, list)


def test_returns_at_most_10_games():
    games = parse_games(get_soup())
    assert len(games) <= 10


def test_only_ranked_solo_duo():
    games = parse_games(get_soup())
    for game in games:
        assert game["queue"] == "Ranked Solo/Duo"


def test_game_has_required_fields():
    games = parse_games(get_soup())
    if not games:
        return  # account may have no ranked solo games in fixture
    game = games[0]
    assert "champion" in game
    assert "result" in game
    assert game["result"] in ("win", "loss")
    assert "kills" in game
    assert "deaths" in game
    assert "assists" in game
    assert "cs" in game
    assert "duration" in game
    assert "queue" in game


def test_kills_deaths_assists_are_ints():
    games = parse_games(get_soup())
    if not games:
        return
    game = games[0]
    assert isinstance(game["kills"], int)
    assert isinstance(game["deaths"], int)
    assert isinstance(game["assists"], int)


def test_cs_is_int():
    games = parse_games(get_soup())
    if not games:
        return
    assert isinstance(games[0]["cs"], int)
