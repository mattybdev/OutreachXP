# OutreachXP

A Tamagotchi-style web game that rewards outreach for the Serious Games Showcase & Challenge. The game design lives in [`docs/GAME_DESIGN_DOCUMENT.md`](docs/GAME_DESIGN_DOCUMENT.md).

## Current state: Ping Lab

The first milestone is **Ping**, the procedurally generated creature, plus the **Ping Lab** tuning page (GDD §9.4).

- Ping is drawn entirely in code from a *genome*: hatch seed, life stage, form, mood and four stats (Intellect, Craft, Heart, Authority).
- Body parts grow continuously with each stat, and each stat tier unlocks generated details (glasses, tool belt, heart aura, badge, sash, shield, …).
- The same genome always renders the same Ping, so past seasons' Pings can be redrawn exactly.

## Develop

```bash
npm install
npm run dev        # Ping Lab at http://localhost:5173
npm test           # unit tests
npm run build      # type-check + production build into dist/
npm run sheet      # writes ping-sheet.png, a contact sheet of sample Pings
```

## Project layout

| Path | What it is |
|---|---|
| `src/theme.ts` | All brand colors, fonts and pixel palette ramps (the one file to edit for a rebrand) |
| `src/ping/genome.ts` | Stats, tiers, life stages, and form rules |
| `src/ping/traits.ts` | Seeded random traits that make each Ping unique |
| `src/ping/raster.ts` | Pixel buffer, lit shape filling, dithering and auto-outlines |
| `src/ping/render.ts` | The Ping generator |
| `src/lab/` | The Ping Lab page |

## Deploy

`.github/workflows/deploy.yml` runs the tests on every push and deploys to GitHub Pages from the repository's default branch. Do not use the "Static HTML" or "Jekyll" Pages starter workflows: they publish the unbuilt source, which browsers cannot run. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
