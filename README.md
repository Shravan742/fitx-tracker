# GymOS

Multi-user fitness tracker with real accounts: adaptive meal planning, partner invite/accept linking for shared "Cook together" plans, workout library with anatomical muscle diagrams, 1RM tracking, sleep logging, and weight trend tracking — offline-first PWA on Firebase Hosting.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4, Firebase (Auth + Firestore), Chart.js, [`react-body-highlighter`](https://github.com/Stomatos/react-body-highlighter) for anatomical muscle diagrams.

## Features

- **Adaptive meal planning** — recipes scale portions to hit your exact calorie/protein targets per slot; yesterday's surplus/deficit carries into today's plan
- **Workout library** — 35 exercises with real demo photo sequences, anterior/posterior anatomical muscle highlighting, YouTube tutorials, and progressive-overload suggestions based on 1RM
- **Weight tracking** — daily logging with a trend chart and goal-alignment feedback (bulk/cut/maintain)
- **Sleep logging** with a 14-day trend chart
- **Offline-first PWA** — installable, works without a connection

## Development

```bash
npm install
npm run dev      # dev server
npm run build    # production build → dist/
```

## Setup

Create a Firebase project (Auth with Email/Password enabled, Firestore in production mode), copy `.env.example` to `.env.local` and fill in the web app config from Project Settings.

## Deploy

```bash
npx firebase login    # one-time, opens a browser
npm run deploy         # builds and deploys to Firebase Hosting
```
