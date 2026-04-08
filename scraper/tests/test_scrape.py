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


def test_only_ranked_queues():
    games = parse_games(get_soup())
    for game in games:
        assert game["queue"] in ("Ranked Solo/Duo", "Ranked Flex")


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
    assert "matchId" in game
    # matchId may be None if the fixture page lacks match links — that is acceptable


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


def test_lp_delta_present_for_win():
    games = parse_games(get_soup())
    wins_with_lp = [g for g in games if g["result"] == "win" and g.get("lpDelta") is not None]
    assert wins_with_lp, "expected at least one win with lpDelta in fixture"
    assert wins_with_lp[0]["lpDelta"] == 25


def test_lp_delta_present_for_loss():
    games = parse_games(get_soup())
    losses_with_lp = [g for g in games if g["result"] == "loss" and g.get("lpDelta") is not None]
    assert losses_with_lp, "expected at least one loss with lpDelta in fixture"
    assert losses_with_lp[0]["lpDelta"] == -15


def test_lp_delta_none_when_absent():
    games = parse_games(get_soup())
    # The first game in the fixture is a promotion row — lpChange contains
    # "Promoted to Silver II" text, no numeric LP → lpDelta must be None
    assert games[0]["lpDelta"] is None
