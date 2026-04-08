from pathlib import Path
from unittest.mock import patch
from bs4 import BeautifulSoup
from match_scraper import scrape_match, _parse_match_soup

FIXTURE = Path(__file__).parent / "fixtures" / "sample_match.html"


def get_soup():
    return BeautifulSoup(FIXTURE.read_text(encoding="utf-8"), "lxml")


def test_returns_10_participants():
    result = _parse_match_soup("12345", get_soup())
    assert len(result["participants"]) == 10


def test_match_id_preserved():
    result = _parse_match_soup("99999", get_soup())
    assert result["matchId"] == "99999"


def test_team_assignment():
    result = _parse_match_soup("12345", get_soup())
    team1 = [p for p in result["participants"] if p["team"] == 1]
    team2 = [p for p in result["participants"] if p["team"] == 2]
    assert len(team1) == 5
    assert len(team2) == 5


def test_first_team1_player_is_hopa():
    result = _parse_match_soup("12345", get_soup())
    team1 = [p for p in result["participants"] if p["team"] == 1]
    assert team1[0]["summonerName"] == "Hopa#Hopa"
    assert team1[0]["champion"] == "Sejuani"


def test_kda_parsed_correctly():
    result = _parse_match_soup("12345", get_soup())
    hopa = next(p for p in result["participants"] if p["summonerName"] == "Hopa#Hopa")
    assert hopa["kills"] == 5
    assert hopa["deaths"] == 2
    assert hopa["assists"] == 8


def test_cs_parsed_correctly():
    result = _parse_match_soup("12345", get_soup())
    hopa = next(p for p in result["participants"] if p["summonerName"] == "Hopa#Hopa")
    assert hopa["cs"] == 200


def test_score_formula():
    result = _parse_match_soup("12345", get_soup())
    hopa = next(p for p in result["participants"] if p["summonerName"] == "Hopa#Hopa")
    # score = min(10.0, (5*2 + 8) / max(2,1) + 200/100) = min(10.0, 11.0) = 10.0
    assert hopa["score"] == 10.0


def test_team_kills_summed():
    result = _parse_match_soup("12345", get_soup())
    # team1: 5+4+3+1+7=20, team2: 3+2+4+3+3=15
    assert result["team1Kills"] == 20
    assert result["team2Kills"] == 15


def test_scrape_match_calls_fetch(mocker):
    mock_fetch = mocker.patch("match_scraper.fetch_page", return_value=get_soup())
    result = scrape_match("12345")
    mock_fetch.assert_called_once_with("https://www.leagueofgraphs.com/match/euw/12345")
    assert result["matchId"] == "12345"
    assert len(result["participants"]) == 10


def test_scrape_match_raises_if_no_table(mocker):
    empty_soup = BeautifulSoup("<html><body></body></html>", "lxml")
    mocker.patch("match_scraper.fetch_page", return_value=empty_soup)
    try:
        scrape_match("00000")
        assert False, "Should have raised"
    except ValueError as e:
        assert "00000" in str(e)
