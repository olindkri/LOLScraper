from unittest.mock import MagicMock
from firebase_client import build_payload, write_to_firebase, read_records, write_records, read_cached_match_ids, write_match

SAMPLE_PLAYERS = [
    {
        "id": "oliver",
        "displayName": "Oliver",
        "gamertag": "Hopa#Hopa",
        "url": "https://www.leagueofgraphs.com/summoner/euw/Hopa-Hopa",
        "games": [{"champion": "Jinx", "result": "win", "kills": 8, "deaths": 2, "assists": 10, "cs": 200, "duration": "32:14", "queue": "Ranked Solo/Duo"}],
        "stats": {"wins": 1, "losses": 0, "winRate": 1.0, "avgKda": 9.0, "avgCs": 200, "mostPlayedChampion": "Jinx"},
        "soloRank": {"tier": "gold", "division": "II", "lp": 67},
    }
]

SAMPLE_GROUP = {"totalWins": 1, "totalLosses": 0, "winRate": 1.0, "lastUpdated": "2026-01-01T00:00:00+00:00"}


def test_build_payload_structure():
    payload = build_payload(SAMPLE_PLAYERS, SAMPLE_GROUP)
    assert "players" in payload
    assert "group" in payload
    assert "oliver" in payload["players"]
    assert payload["players"]["oliver"]["displayName"] == "Oliver"
    assert payload["group"]["totalWins"] == 1


def test_build_payload_games_included():
    payload = build_payload(SAMPLE_PLAYERS, SAMPLE_GROUP)
    assert len(payload["players"]["oliver"]["games"]) == 1
    assert payload["players"]["oliver"]["games"][0]["champion"] == "Jinx"


def test_write_to_firebase_calls_update(mocker):
    mock_ref = MagicMock()
    mocker.patch("firebase_client._init_app")  # prevent env var + Firebase SDK call
    mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    write_to_firebase(SAMPLE_PLAYERS, SAMPLE_GROUP, database_url="https://fake.firebaseio.com")
    mock_ref.update.assert_called_once()
    call_args = mock_ref.update.call_args[0][0]
    assert "players" in call_args
    assert "group" in call_args


def test_read_records_returns_dict(mocker):
    mock_ref = MagicMock()
    mock_ref.get.return_value = {"bestWinStreak": {"value": 5}, "bestKda": {"value": 3.2}}
    mocker.patch("firebase_client._init_app")
    mock_db_ref = mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    result = read_records("https://fake.firebaseio.com")
    assert result == {"bestWinStreak": {"value": 5}, "bestKda": {"value": 3.2}}
    mock_db_ref.assert_called_with("/records")


def test_read_records_returns_empty_when_none(mocker):
    mock_ref = MagicMock()
    mock_ref.get.return_value = None
    mocker.patch("firebase_client._init_app")
    mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    result = read_records("https://fake.firebaseio.com")
    assert result == {}


def test_write_records_calls_set(mocker):
    mock_ref = MagicMock()
    mocker.patch("firebase_client._init_app")
    mock_db_ref = mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    records = {"bestWinStreak": {"playerId": "oliver", "value": 8}}
    write_records(records, "https://fake.firebaseio.com")
    mock_db_ref.assert_called_with("/records")
    mock_ref.set.assert_called_once_with(records)


def test_read_cached_match_ids_returns_set(mocker):
    mock_ref = MagicMock()
    mock_ref.get.return_value = {
        "7813808785": {"matchId": "7813808785"},
        "7813808786": {"matchId": "7813808786"},
    }
    mocker.patch("firebase_client._init_app")
    mock_db_ref = mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    result = read_cached_match_ids("https://fake.firebaseio.com")
    assert result == {"7813808785", "7813808786"}
    mock_db_ref.assert_called_with("/matches")


def test_read_cached_match_ids_returns_empty_when_none(mocker):
    mock_ref = MagicMock()
    mock_ref.get.return_value = None
    mocker.patch("firebase_client._init_app")
    mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    result = read_cached_match_ids("https://fake.firebaseio.com")
    assert result == set()


def test_write_match_calls_set_at_correct_path(mocker):
    mock_ref = MagicMock()
    mocker.patch("firebase_client._init_app")
    mock_db_ref = mocker.patch("firebase_client.db.reference", return_value=mock_ref)
    match_data = {"matchId": "7813808785", "participants": [], "team1Kills": 20, "team2Kills": 15}
    write_match(match_data, "https://fake.firebaseio.com")
    mock_db_ref.assert_called_with("/matches/7813808785")
    mock_ref.set.assert_called_once_with(match_data)


def test_build_payload_includes_solo_rank():
    payload = build_payload(SAMPLE_PLAYERS, SAMPLE_GROUP)
    oliver = payload["players"]["oliver"]
    assert "soloRank" in oliver
    assert oliver["soloRank"] == {"tier": "gold", "division": "II", "lp": 67}


def test_build_payload_solo_rank_none_when_unranked():
    unranked_players = [{**SAMPLE_PLAYERS[0], "soloRank": None}]
    payload = build_payload(unranked_players, SAMPLE_GROUP)
    assert payload["players"]["oliver"]["soloRank"] is None
