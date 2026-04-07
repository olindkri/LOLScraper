# Scraper

Python script that scrapes leagueofgraphs.com and writes ranked game data to Firebase Realtime Database.

## GitHub Secrets Required

Set these in your GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Description |
|--------|-------------|
| `FIREBASE_CREDENTIALS` | Service account JSON as a single-line string |
| `FIREBASE_DATABASE_URL` | e.g. `https://your-project-default-rtdb.firebaseio.com` |

To get `FIREBASE_CREDENTIALS`:
1. Firebase Console → Project Settings → Service Accounts
2. Generate new private key → download JSON
3. Minify the JSON to a single line (e.g. `jq -c . service-account.json`)
4. Paste as the secret value

## Local development

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export FIREBASE_CREDENTIALS='{"type":"service_account",...}'
export FIREBASE_DATABASE_URL='https://your-project-default-rtdb.firebaseio.com'
python main.py
```

## Running tests

```bash
source .venv/bin/activate
python -m pytest tests/ -v
```
