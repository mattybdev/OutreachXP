# OutreachXP

A Tamagotchi-style web game that rewards outreach for the Serious Games Showcase & Challenge. The game design lives in [`docs/GAME_DESIGN_DOCUMENT.md`](docs/GAME_DESIGN_DOCUMENT.md).

## Current state

- **The game** (`index.html`): set up a season, log outreach in a few taps, track contacts through the pipeline, and earn XP that levels up and grows **Ping**, your procedurally generated outreach companion. Ping has care meters and moods, streaks reward consistency, weekly/monthly quests and achievements add goals, and a Stats & Journal screen shows the outreach funnel, weekly activity and Ping's milestones. Each achievement unlocks a new procedurally drawn background for Ping's room. Data stays in the browser (IndexedDB), with JSON export/import. It installs as an app (PWA) and works offline.
- **Ping Lab** (`lab.html`): a tuning page for the generator, with sliders for every stat, life stage, mood and seed.

## Develop

```bash
npm install
npm run dev        # game at http://localhost:5173, Ping Lab at /lab.html
npm test           # unit tests
npm run build      # type-check + production build into dist/
npm run sheet      # writes ping-sheet.png, a contact sheet of sample Pings
PING_SHEET=1 PING_SHEET_FILE=scripts/icons.test.ts npx vitest run   # redraws the app icons in public/icons
```

## Project layout

| Path | What it is |
|---|---|
| `src/theme.ts` | All brand colors, fonts and pixel palette ramps (the one file to edit for a rebrand) |
| `src/ping/genome.ts` | Stats, tiers, life stages, and form rules |
| `src/ping/traits.ts` | Seeded random traits that make each Ping unique |
| `src/ping/raster.ts` | Pixel buffer, lit shape filling, dithering and auto-outlines |
| `src/ping/render.ts` | The Ping generator |
| `src/ping/backgrounds.ts` | Procedural room backgrounds unlocked by achievements |
| `src/game/` | Game rules, XP engine, actions and storage (no UI; fully unit-tested) |
| `src/app/` | The game UI: views, Quick Log, and app shell |
| `src/lab/` | The Ping Lab page |
| `src/pwa/`, `scripts/pwa.ts` | The offline service worker and the build step that lists the files it saves |
| `public/manifest.webmanifest`, `public/icons/` | App manifest and icons for installing |

## Deploy

`.github/workflows/deploy.yml` runs the tests on every push and deploys to GitHub Pages from the repository's default branch. Do not use the "Static HTML" or "Jekyll" Pages starter workflows: they publish the unbuilt source, which browsers cannot run. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.

The service worker only runs in the built app (`npm run build && npm run preview`), not the dev server. Installed copies pick up a new deploy the next time they are opened and offer a **Reload**.
