# Champion Mastery Points Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scrape mastery points for each player's most-played champion from the leagueofgraphs page (already fetched), store in Firebase, and display as `563K pts` below the champion badge in the scoreboard's top champ column.

**Architecture:** Two independent subsystems — scraper and frontend. Scraper: add `_parse_mastery(soup)` to `scrape.py`, update `fetch_games_for_player` to return a 3-tuple, wire into `main.py`. Frontend: destructure `mostPlayedChampionMastery` from player stats in `ScoreboardRow.jsx` and render a dim sub-label.

**Tech Stack:** Python 3.13, BeautifulSoup4, pytest 8.3 (scraper); React 19, Node built-in test runner `node --test` with static source analysis tests (frontend).

---

### Task 1: `_parse_mastery` — scraper function

**Files:**
- Modify: `scraper/scrape.py` (add function after `_parse_solo_rank`)
- Modify: `scraper/tests/test_scrape.py` (add tests)

**Context:** `scrape.py` already imports `re` and `BeautifulSoup`. Tests in `tests/test_scrape.py` use inline HTML strings for unit tests (see `test_parse_solo_rank_unranked_returns_none` and similar). Run tests from `scraper/` with `.venv/bin/python3 -m pytest tests/test_scrape.py -v`.

The live page contains elements like:
```html
<div class="relative requireTooltip"
     tooltip="&lt;itemname&gt;Mastery Level 44&lt;/itemname&gt;&lt;br/&gt;Points: 562,779&lt;br/&gt;...">
  <a href="/summoner/champions/twitch/euw/Hopa-Hopa">
    <img alt="Twitch" title="Twitch" .../>
  </a>
  <img alt="Mastery Level 44" class="championMasteryLevelIcon" .../>
</div>
```
BeautifulSoup decodes HTML entities in attribute values, so `div.get('tooltip')` returns the decoded string containing `Points: 562,779`. The champion name is in the `alt` attribute of the `<img>` inside the `<a>` tag.

- [ ] **Step 1: Add failing tests to `scraper/tests/test_scrape.py`**

Add these tests at the bottom of the file (add `from scrape import _parse_mastery` to the existing import line):

```python
from scrape import parse_games, _parse_solo_rank, _parse_mastery
```

```python
def _mastery_html(*entries):
    """Build minimal HTML with mastery tooltip divs. entries = [(champion, level, points_str)]"""
    rows = []
    for champ, level, pts in entries:
        rows.append(f"""
        <div class="relative requireTooltip"
             tooltip="&lt;itemname&gt;Mastery Level {level}&lt;/itemname&gt;&lt;br/&gt;Points: {pts}">
          <a href="/foo"><img alt="{champ}" title="{champ}"/></a>
        </div>
        """)
    return BeautifulSoup("".join(rows), "lxml")


def test_parse_mastery_returns_dict():
    soup = _mastery_html(("Twitch", 44, "562,779"))
    result = _parse_mastery(soup)
    assert isinstance(result, dict)


def test_parse_mastery_extracts_champion_and_points():
    soup = _mastery_html(("Twitch", 44, "562,779"))
    result = _parse_mastery(soup)
    assert result == {"Twitch": 562779}


def test_parse_mastery_multiple_champions():
    soup = _mastery_html(("Twitch", 44, "562,779"), ("Kayn", 24, "269,203"))
    result = _parse_mastery(soup)
    assert result == {"Twitch": 562779, "Kayn": 269203}


def test_parse_mastery_empty_page_returns_empty_dict():
    soup = BeautifulSoup("<html></html>", "lxml")
    result = _parse_mastery(soup)
    assert result == {}


def test_parse_mastery_skips_divs_without_mastery_tooltip():
    html = """
    <div class="relative requireTooltip" tooltip="some other tooltip">
      <a href="/foo"><img alt="Twitch" title="Twitch"/></a>
    </div>
    """
    soup = BeautifulSoup(html, "lxml")
    result = _parse_mastery(soup)
    assert result == {}
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python3 -m pytest tests/test_scrape.py -v -k "mastery"
```

Expected: 5 tests FAIL with `ImportError: cannot import name '_parse_mastery'`.

- [ ] **Step 3: Implement `_parse_mastery` in `scraper/scrape.py`**

Add after the `_parse_solo_rank` function (around line 193):

```python
def _parse_mastery(soup: BeautifulSoup) -> dict:
    """Parse champion mastery points from the summoner page.

    Returns {champion_name: points_int} for all champions with a mastery
    tooltip on the page. Returns {} if none are found.
    """
    result = {}
    for div in soup.find_all("div", class_="requireTooltip"):
        tooltip = div.get("tooltip", "")
        if "Mastery Level" not in tooltip:
            continue
        pts_match = re.search(r"Points: ([\d,]+)", tooltip)
        if not pts_match:
            continue
        link = div.find("a")
        if not link:
            continue
        champ_img = link.find("img")
        if not champ_img:
            continue
        champ_name = champ_img.get("alt", "").strip()
        if not champ_name:
            continue
        result[champ_name] = int(pts_match.group(1).replace(",", ""))
    return result
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python3 -m pytest tests/test_scrape.py -v -k "mastery"
```

Expected: 5 tests PASS.

- [ ] **Step 5: Run all scraper tests to confirm no regressions**

```bash
.venv/bin/python3 -m pytest tests/ -q
```

Expected: 61 passed + 5 new = 66 passed.

- [ ] **Step 6: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper && git add scraper/scrape.py scraper/tests/test_scrape.py && git commit -m "feat: add _parse_mastery to scrape champion mastery points"
```

---

### Task 2: Wire mastery into `fetch_games_for_player` and `main.py`

**Files:**
- Modify: `scraper/scrape.py:26-57` (`fetch_games_for_player` return type)
- Modify: `scraper/main.py:27-28` (unpack 3-tuple, add mastery to stats)

**Context:** `fetch_games_for_player` currently returns `(games, rank)`. It fetches the summoner page (stored in `soup`) on line ~39, which is also where `_parse_mastery` should run. `main.py` calls it on line 27 as `games, rank = fetch_games_for_player(player["url"])`. `firebase_client.write_to_firebase` stores the full player dict including `stats` — adding a key to `stats` dict is automatically stored without any Firebase client changes.

- [ ] **Step 1: Update `fetch_games_for_player` in `scraper/scrape.py`**

Change the function signature and body. The current function starts at line 26. Update the docstring return line and add `mastery = _parse_mastery(soup)` after `rank = _parse_solo_rank(soup)`, then update the return:

```python
def fetch_games_for_player(base_url: str, target: int = 30) -> tuple[list[dict], dict | None, dict]:
    """
    Fetch up to `target` ranked games, the current Solo/Duo rank, and champion
    mastery points for a player.

    Returns:
        A tuple of (games, rank, mastery) where rank is a dict with keys 'tier',
        'division', 'lp', or None if the player is unranked; mastery is a dict
        mapping champion display name to mastery points int (empty if unavailable).
    """
    # Page 1: full summoner page — extract rank and mastery before pagination
    soup = fetch_page(base_url)
    rank = _parse_solo_rank(soup)
    mastery = _parse_mastery(soup)
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

    return games[:target], rank, mastery
```

- [ ] **Step 2: Update `main.py` to unpack 3-tuple and add mastery to stats**

Find line 27 in `scraper/main.py`:
```python
games, rank = fetch_games_for_player(player["url"])
stats = compute_player_stats(games)
```

Replace with:
```python
games, rank, mastery = fetch_games_for_player(player["url"])
stats = compute_player_stats(games)
mastery_pts = mastery.get(stats["mostPlayedChampion"])
if mastery_pts is not None:
    stats["mostPlayedChampionMastery"] = mastery_pts
```

- [ ] **Step 3: Run all scraper tests to confirm no regressions**

```bash
cd /Users/olindkri/Projects/LOLScraper/scraper && .venv/bin/python3 -m pytest tests/ -q
```

Expected: 66 passed.

- [ ] **Step 4: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper && git add scraper/scrape.py scraper/main.py && git commit -m "feat: wire mastery points into fetch_games_for_player and player stats"
```

---

### Task 3: Frontend — display mastery points in ScoreboardRow

**Files:**
- Modify: `frontend/src/components/ScoreboardRow.jsx:41` (destructuring) and `:204-219` (col-champ cell)
- Create: `frontend/src/components/scoreboard-mastery-display.test.mjs`

**Context:** Tests use Node's built-in test runner with static source analysis (read file → assert regex). Run with `node --test src/components/scoreboard-mastery-display.test.mjs` from `frontend/`. The `col-champ` cell is the last `<td>` in the main row (around line 204). `stats` is destructured on line 41. The dim sub-label pattern (small mono text below a primary value) already exists in the win rate cell: `0.65rem`, `var(--fg-dim)`, `var(--font-mono)`, `marginTop: '2px'`.

- [ ] **Step 1: Create the failing test**

Create `frontend/src/components/scoreboard-mastery-display.test.mjs`:

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const scoreboardRowPath = new URL('./ScoreboardRow.jsx', import.meta.url);

test('ScoreboardRow destructures mostPlayedChampionMastery from stats', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /mostPlayedChampionMastery\s*=\s*null/);
});

test('ScoreboardRow renders mastery points as rounded K value', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /Math\.round\(mostPlayedChampionMastery\s*\/\s*1000\)/);
  assert.match(source, /K pts/);
});

test('ScoreboardRow only renders mastery label when value is positive', async () => {
  const source = await readFile(scoreboardRowPath, 'utf8');
  assert.match(source, /mostPlayedChampionMastery\s*>\s*0/);
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/olindkri/Projects/LOLScraper/frontend && node --test src/components/scoreboard-mastery-display.test.mjs
```

Expected: 3 tests FAIL.

- [ ] **Step 3: Update destructuring in `ScoreboardRow.jsx` line 41**

Find:
```jsx
const { wins = 0, losses = 0, winRate = 0, avgKda = 0, avgCs = 0, mostPlayedChampion = '' } = stats;
```

Replace with:
```jsx
const { wins = 0, losses = 0, winRate = 0, avgKda = 0, avgCs = 0, mostPlayedChampion = '', mostPlayedChampionMastery = null } = stats;
```

- [ ] **Step 4: Update the `col-champ` cell in `ScoreboardRow.jsx`**

Find the `col-champ` cell (around line 204):
```jsx
        {/* Champion */}
        <td className="col-champ" style={{ padding: '14px 20px 14px 12px' }}>
          {mostPlayedChampion
            ? (
              <ChampionBadge
                championName={mostPlayedChampion}
                size={20}
                textStyle={{
                  fontSize: '0.78rem',
                  color: 'var(--fg-muted)',
                  fontFamily: 'var(--font-data)',
                }}
              />
            )
            : <span style={{ fontSize: '0.7rem', color: 'var(--fg-dim)' }}>—</span>
          }
        </td>
```

Replace with:
```jsx
        {/* Champion */}
        <td className="col-champ" style={{ padding: '14px 20px 14px 12px' }}>
          {mostPlayedChampion
            ? (
              <>
                <ChampionBadge
                  championName={mostPlayedChampion}
                  size={20}
                  textStyle={{
                    fontSize: '0.78rem',
                    color: 'var(--fg-muted)',
                    fontFamily: 'var(--font-data)',
                  }}
                />
                {mostPlayedChampionMastery > 0 && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: 'var(--fg-dim)',
                    marginTop: '2px',
                  }}>
                    {Math.round(mostPlayedChampionMastery / 1000)}K pts
                  </div>
                )}
              </>
            )
            : <span style={{ fontSize: '0.7rem', color: 'var(--fg-dim)' }}>—</span>
          }
        </td>
```

- [ ] **Step 5: Run new tests to confirm they pass**

```bash
cd /Users/olindkri/Projects/LOLScraper/frontend && node --test src/components/scoreboard-mastery-display.test.mjs
```

Expected: 3 tests PASS.

- [ ] **Step 6: Run all frontend tests to confirm no regressions**

```bash
node --test src/components/scoreboard-champion-icons.test.mjs src/components/scoreboard-expand-toggle.test.mjs src/components/scoreboard-mobile-dots.test.mjs src/components/scoreboard-mobile-columns.test.mjs src/components/scoreboard-rank-display.test.mjs src/components/match-modal-champion-icons.test.mjs src/champions/catalog.test.mjs src/champions/resolveChampion.test.mjs
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
cd /Users/olindkri/Projects/LOLScraper && git add frontend/src/components/ScoreboardRow.jsx frontend/src/components/scoreboard-mastery-display.test.mjs && git commit -m "feat: display mastery points below top champ badge in scoreboard"
```
