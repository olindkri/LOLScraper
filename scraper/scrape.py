import re
import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

RANKED_SOLO_DUO = "Ranked Solo/Duo"


def fetch_page(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def parse_games(soup: BeautifulSoup) -> list[dict]:
    """
    Parse up to 10 Ranked Solo/Duo games from a leagueofgraphs summoner page.

    Returns a list of dicts with keys:
        champion, result, kills, deaths, assists, cs, duration, queue
    """
    games = []

    table = soup.find("table", class_="recentGamesTable")
    if not table:
        return games

    for row in table.find_all("tr"):
        classes = row.get("class", [])
        if "recentGamesTableHeader" in classes or "filtersBlock" in classes:
            continue

        # Queue type — only keep Ranked Solo/Duo
        dark_td = row.find("td", class_="resultCellDark")
        if not dark_td:
            continue
        mode_el = dark_td.find("div", class_="gameMode")
        queue = mode_el.get("tooltip", "").strip() if mode_el else ""
        if queue != RANKED_SOLO_DUO:
            continue

        # Result
        result_el = dark_td.find("div", class_="victoryDefeatText")
        result = "win" if result_el and "victory" in result_el.get("class", []) else "loss"

        # Champion
        champ_td = row.find("td", class_="championCellLight")
        champ_img = champ_td.find("img") if champ_td else None
        champion = champ_img.get("alt", "") if champ_img else ""

        # KDA
        kda_td = row.find("td", class_="kdaColumn")
        kills = _parse_span_int(kda_td, "kills") if kda_td else 0
        deaths = _parse_span_int(kda_td, "deaths") if kda_td else 0
        assists = _parse_span_int(kda_td, "assists") if kda_td else 0

        # CS — first .number span inside .cs div
        cs = 0
        if kda_td:
            cs_div = kda_td.find("div", class_="cs")
            if cs_div:
                number_span = cs_div.find("span", class_="number")
                if number_span:
                    cs = _to_int(number_span.get_text(strip=True))

        # Duration — from matchData div (e.g. "43 min ago - 22min 37s")
        duration = ""
        match_data = row.find("div", class_="matchData")
        if match_data:
            text = match_data.get_text(strip=True)
            m = re.search(r"(\d+min\s*\d+s)", text)
            duration = m.group(1) if m else ""

        games.append({
            "champion": champion,
            "result": result,
            "kills": kills,
            "deaths": deaths,
            "assists": assists,
            "cs": cs,
            "duration": duration,
            "queue": RANKED_SOLO_DUO,
        })

        if len(games) == 10:
            break

    return games


def _parse_span_int(parent, class_name: str) -> int:
    el = parent.find("span", class_=class_name)
    return _to_int(el.get_text(strip=True)) if el else 0


def _to_int(text: str) -> int:
    m = re.search(r"\d+", text.replace(",", ""))
    return int(m.group()) if m else 0
