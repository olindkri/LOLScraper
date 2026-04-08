import re
import time
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

RANKED_QUEUES = {"Ranked Solo/Duo", "Ranked Flex"}
BASE_URL = "https://www.leagueofgraphs.com"


def fetch_page(url: str) -> BeautifulSoup:
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def fetch_games_for_player(base_url: str, target: int = 30) -> list[dict]:
    """
    Fetch up to `target` ranked games for a player.

    Loads the first 10 from the main page, then follows the AJAX cursor
    embedded in `data-additional-url` on the "See more" button to fetch
    subsequent batches of 10 until `target` is reached or no more exist.
    """
    # Page 1: full summoner page
    soup = fetch_page(base_url)
    games = _parse_rows(soup.find_all("tr"))

    # Subsequent pages: AJAX partial responses (raw <tr> rows, no table wrapper)
    while len(games) < target:
        btn = soup.find("button", class_="see_more_ajax_button")
        if not btn or not btn.get("data-additional-url"):
            break

        time.sleep(0.5)
        soup = fetch_page(BASE_URL + btn["data-additional-url"])
        new_games = _parse_rows(soup.find_all("tr"))
        if not new_games:
            break

        games.extend(new_games)

    return games[:target]


def _parse_rows(rows) -> list[dict]:
    """Parse ranked games from a list of <tr> elements."""
    games = []

    for row in rows:
        classes = row.get("class", [])
        if "recentGamesTableHeader" in classes or "filtersBlock" in classes:
            continue

        # Queue type — keep Solo/Duo and Flex
        dark_td = row.find("td", class_="resultCellDark")
        if not dark_td:
            continue
        mode_el = dark_td.find("div", class_="gameMode")
        queue = mode_el.get("tooltip", "").strip() if mode_el else ""
        if queue not in RANKED_QUEUES:
            continue

        # Result
        result_el = dark_td.find("div", class_="victoryDefeatText")
        result = "win" if result_el and "victory" in result_el.get("class", []) else "loss"

        # LP delta — from lpChange div inside resultCellDark
        lp_delta = None
        lp_div = dark_td.find("div", class_="lpChange")
        if lp_div:
            lp_match = re.search(r'([+-]\d+)\s*LP', lp_div.get_text())
            if lp_match:
                lp_delta = int(lp_match.group(1))

        # Champion
        champ_td = row.find("td", class_="championCellLight")
        champ_img = champ_td.find("img") if champ_td else None
        champion = champ_img.get("alt", "") if champ_img else ""

        # Match ID — from link on champion cell
        match_id = None
        if champ_td:
            match_link = champ_td.find("a")
            if match_link and match_link.get("href"):
                m = re.search(r"/match/\w+/(\d+)", match_link["href"])
                match_id = m.group(1) if m else None

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
            "queue": queue,
            "matchId": match_id,
            "lpDelta": lp_delta,
        })

    return games


# Keep parse_games as a thin wrapper for backwards compatibility with tests
def parse_games(soup: BeautifulSoup) -> list[dict]:
    table = soup.find("table", class_="recentGamesTable")
    rows = table.find_all("tr") if table else []
    return _parse_rows(rows)


def _parse_span_int(parent, class_name: str) -> int:
    el = parent.find("span", class_=class_name)
    return _to_int(el.get_text(strip=True)) if el else 0


def _to_int(text: str) -> int:
    m = re.search(r"\d+", text.replace(",", ""))
    return int(m.group()) if m else 0


def _parse_solo_rank(soup: BeautifulSoup) -> dict | None:
    """Extract the Solo/Duo rank from the summoner page soup.

    Returns a dict with keys 'tier', 'division', 'lp', or None if the player
    is unranked or the page does not contain a parseable Solo/Duo rank block.
    """
    for block in soup.select(".best-league"):
        queue_el = block.find(class_="queue")
        if not queue_el or "soloqueue" not in queue_el.get_text(strip=True).lower():
            continue

        tier_el = block.find(class_="leagueTier")
        if not tier_el:
            continue
        tier_text = tier_el.get_text(strip=True)  # e.g. "Emerald IV" or "Master"

        lp_el = block.find(class_="leaguePoints")
        lp = _to_int(lp_el.get_text(strip=True)) if lp_el else 0

        parts = tier_text.split()
        tier = parts[0].lower()           # "emerald", "master", etc.
        division = parts[1] if len(parts) > 1 else None  # "IV" or None for apex tiers

        return {"tier": tier, "division": division, "lp": lp}

    return None
