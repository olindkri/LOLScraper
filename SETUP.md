# Setup Guide

Follow these steps once to get the project running end-to-end.

---

## 1. Create a Firebase Project

1. Go to https://console.firebase.google.com → **Add project**
2. Name it (e.g. `lol-tracker`) and create it
3. In the project, enable:
   - **Realtime Database**: Build → Realtime Database → Create Database → choose your region → Start in **test mode**
   - **Hosting**: Build → Hosting → Get started (click through the wizard; the deploy workflow handles actual deploys)
4. Note your **database URL** shown in the Realtime Database panel (e.g. `https://lol-tracker-default-rtdb.firebaseio.com`)

---

## 2. Get Firebase Credentials

### Service account (for scraper + deploy)

1. Firebase Console → Project Settings (gear icon) → **Service Accounts**
2. Click **Generate new private key** → download the JSON file
3. Minify it to a single line:
   ```bash
   cat service-account.json | python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin)))"
   ```
4. Save the output — this is your `FIREBASE_CREDENTIALS` secret

### Web app config (for frontend)

1. Firebase Console → Project Settings → **General** → scroll to **Your apps**
2. Click **Add app** → Web → register the app
3. Copy the `firebaseConfig` object values — these become your `VITE_FIREBASE_*` secrets

---

## 3. Update .firebaserc

Replace `YOUR_FIREBASE_PROJECT_ID` in `.firebaserc` with your actual project ID.

---

## 4. Set GitHub Secrets

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

### Scraper secrets

| Secret | Value |
|--------|-------|
| `FIREBASE_CREDENTIALS` | Service account JSON (single line) |
| `FIREBASE_DATABASE_URL` | e.g. `https://lol-tracker-default-rtdb.firebaseio.com` |

### Deploy secrets

| Secret | Value |
|--------|-------|
| `VITE_FIREBASE_API_KEY` | From web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `lol-tracker.firebaseapp.com` |
| `VITE_FIREBASE_DATABASE_URL` | Same as above |
| `VITE_FIREBASE_PROJECT_ID` | Your project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `lol-tracker.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | From web app config |
| `VITE_FIREBASE_APP_ID` | From web app config |
| `FIREBASE_SERVICE_ACCOUNT` | Same service account JSON (single line) |

---

## 5. Create frontend/.env for local development

Copy `frontend/.env.example` to `frontend/.env` and fill in your real values:

```bash
cp frontend/.env.example frontend/.env
# edit frontend/.env with your Firebase values
```

---

## 6. Push to main

```bash
git push origin main
```

This triggers:
- **Deploy workflow**: builds and deploys the frontend to Firebase Hosting
- Your site will be live at `https://<project-id>.web.app`

---

## 7. Trigger first scrape

In GitHub → **Actions** → **Scrape LoL Stats** → **Run workflow**

The scraper will populate the database and the frontend will show real data.

After that, it runs automatically every 30 minutes.

---

## Local development

```bash
# Frontend
cd frontend && npm run dev

# Scraper (requires .env set up)
cd scraper && source .venv/bin/activate
export FIREBASE_CREDENTIALS='...'
export FIREBASE_DATABASE_URL='...'
python main.py
```
