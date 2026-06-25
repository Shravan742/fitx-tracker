# FitX Tracker — Changelog

## Full React rewrite

Migrated from vanilla HTML/JS to **React 19 + TypeScript + Vite + Tailwind CSS v4**.

- Every view (Dashboard, Workout, Meals, Sleep, Profile, Onboarding) rewritten as typed React components
- Root cause of the recurring "stale JS / broken navigation" bugs in the old app: a hand-rolled service worker kept caching outdated code and intermittently broke the IndexedDB version upgrade. Replaced with `vite-plugin-pwa` + Vite's dev server (proper HMR, auto-generated caching)
- Route-level code splitting (`React.lazy`) cut the initial bundle from 627KB to 247KB
- Anatomical muscle diagrams switched from a hand-drawn placeholder to [`react-body-highlighter`](https://github.com/Stomatos/react-body-highlighter) (MIT, open-source) — realistic anterior/posterior figures with proper muscle highlighting
- Real exercise demo photos sourced from `free-exercise-db` (CC0 public domain)
- Modern dark theme: violet→cyan gradient accents, subtle glow background, gradient buttons

## Workout

- **Daily recommendation engine** (`lib/workoutSplit.ts`) — auto-picks a split (full-body / upper-lower / Push-Pull-Legs) from your goal and how many training days you have, then shows only today's relevant exercises instead of the full 36-exercise library
- Rest days configurable in onboarding/Profile, editable any time
- 1RM-based set/rep suggestions (Epley/Brzycki) narrowed to whichever major lifts match today's focus
- **Log sets directly from an exercise's detail view** — no more re-finding the same exercise in a separate form. Logging merges into today's session instead of creating duplicate session rows for the same day

## Meals — adaptive planning

- Recipes scale their portion size to hit each slot's exact calorie/protein target (clamped 0.5×–3.0×)
- Yesterday's logged surplus/deficit carries into today's plan (±25% cap)
- 7-day plan generated in advance for grocery shopping, with day-to-day recipe variety
- Per-day, per-meal **swap** — cycles through alternative recipes for that exact day/slot
- **Checkable shopping list** — tap to mark items bought, persists per week, checked items sink to the bottom with a progress bar

## Budget

- Weekly grocery budget set in onboarding/Profile
- Plan generation treats the budget as a **hard constraint**: affordable recipes are filtered first, then ranked by macro fit; repeats are expected (and encouraged) since reusing a cheap recipe saves money in real life
- A corrective pass swaps the most expensive remaining slot for the cheapest valid alternative until the week is under budget or no further reduction is possible
- **Real per-ingredient pricing** (`lib/ingredientPrices.ts`) modeled on German discount-supermarket (Aldi/Lidl) prices — potato €0.15/100g up to salmon €2.00/100g — instead of a flat per-diet-type guess
- 268 recipes total: original set + budget-friendly staples (oats, rice, lentils, potato) + Quark-based recipes (Germany's cheapest high-protein staple) + 21 real recipes sourced from TheMealDB (free public API)

## Household meal sharing

For two people in one home who want to meal-prep together while keeping separate training:

- Workouts, sleep, weight, and 1RM history stay fully separate per profile (switch via the avatar button)
- **"Cook together"** toggle in Meals combines both people's macro targets into one shared plan and shopping list
- Every meal card shows each person's **serving split** (e.g. "Shravan: 1.75× · Gouri: 1×") so a shared pot portions correctly
- One shared budget and shared diet filter for what gets cooked — independent of each person's own protein needs

### Bugs found and fixed during the household build
1. "Eaten" only counted the active user's own logged meals against the *combined* target — fixed to sum both people's meals
2. The shared plan used whichever person's individual budget happened to be logged in — fixed with one explicit shared household budget
3. Combined protein didn't equal the sum of each person's own target (the shared cooking-diet filter was overriding each person's personal protein modifier) — fixed so each person's protein need always comes from their own diet, independent of what's being cooked

## Tech stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · IndexedDB (`idb`) · Chart.js · `react-body-highlighter` · `react-router-dom` (HashRouter) · `vite-plugin-pwa`
