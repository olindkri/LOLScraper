# Frontend

React + Vite app deployed to Firebase Hosting. Reads live data from Firebase Realtime Database and displays the group scoreboard.

## Stack

- React 18
- Vite 5
- Tailwind CSS v3
- Firebase JS SDK v10 (Realtime Database)
- Fonts: Russo One, Chakra Petch, JetBrains Mono

## Dev

```bash
npm install
# requires frontend/.env — see SETUP.md
npm run dev
```

## Build

```bash
npm run build   # output → dist/
```

Deployed automatically via `.github/workflows/deploy.yml` on push to `main`.
