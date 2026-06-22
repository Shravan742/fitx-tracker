# FitX Tracker

Personal fitness tracker: adaptive meal planning, workout library with anatomical muscle diagrams, 1RM tracking, sleep logging, and weight trend tracking — offline-first PWA on GitHub Pages.

**Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4, IndexedDB (via `idb`), Chart.js, [`react-body-highlighter`](https://github.com/Stomatos/react-body-highlighter) for anatomical muscle diagrams.

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

## Deploy

Builds to `dist/` with base path `/fitx-tracker/` for GitHub Pages.
