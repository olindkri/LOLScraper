import re
from bs4 import BeautifulSoup
from .scrape import fetch_page, BASE_URL, _parse_span_int


def scrape_match(match_id: str) -> dict:
    soup = fetch_page(f"{BASE_URL}/match/euw/{match_id}")
    return _parse_match_soup(match_id, soup)


def _parse_match_soup(match_id: str, soup: BeautifulSoup) -> dict:
    table = soup.find("table", class_="matchTable")
    if not table:
        raise ValueError(f"No matchTable found for match {match_id}")

    # Determine winner from header row (non-playerRow tr)
    team1_won = None
    for row in table.find_all("tr"):
        if "playerRow" in row.get("class", []):
            continue
        cells = row.find_all("td")
        if not cells:
            continue
        first_text = cells[0].get_text().lower()
        last_text = cells[-1].get_text().lower()
        if "victory" in first_text:
            team1_won = True
            break
        elif "victory" in last_text:
            team1_won = False
            break

    participants = []
    for row in table.find_all("tr", class_="playerRow"):
        summoner_cols = row.find_all("td", class_="summoner_column")
        kda_cols = row.find_all("td", class_="kdaColumn")
        if len(summoner_cols) < 2 or len(kda_cols) < 2:
            continue

        for team_idx in range(2):
            team = team_idx + 1
            summoner_td = summoner_cols[team_idx]
            kda_td = kda_cols[0] if team == 1 else kda_cols[-1]

            champ_img = summoner_td.find("img", alt=True)
            champion = champ_img["alt"] if champ_img else ""

            name_div = summoner_td.find("div", class_="name")
            summoner_name = name_div.get_text(strip=True) if name_div else ""

            kills = _parse_span_int(kda_td, "kills")
            deaths = _parse_span_int(kda_td, "deaths")
            assists = _parse_span_int(kda_td, "assists")

            cs = 0
            cs_div = kda_td.find("div", class_="cs")
            if cs_div:
                m = re.search(r"(\d+)\s*CS", cs_div.get_text())
                cs = int(m.group(1)) if m else 0

            vision_score = None
            vs_div = kda_td.find("div", class_="visionScore")
            if vs_div:
                m = re.search(r"(\d+)", vs_div.get_text())
                vision_score = int(m.group(1)) if m else None

            score = min(10.0, round((kills * 2 + assists) / max(deaths, 1) + cs / 100, 1))

            participants.append({
                "summonerName": summoner_name,
                "champion": champion,
                "team": team,
                "kills": kills,
                "deaths": deaths,
                "assists": assists,
                "cs": cs,
                "visionScore": vision_score,
                "score": score,
            })

    team1_kills = sum(p["kills"] for p in participants if p["team"] == 1)
    team2_kills = sum(p["kills"] for p in participants if p["team"] == 2)

    return {
        "matchId": match_id,
        "team1Won": team1_won,
        "participants": participants,
        "team1Kills": team1_kills,
        "team2Kills": team2_kills,
    }
