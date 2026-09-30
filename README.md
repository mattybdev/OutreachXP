# OutreachXP

A Tamagotchi-style web game that rewards outreach for the Serious Games Showcase & Challenge. The game design lives in [`docs/GAME_DESIGN_DOCUMENT.md`](docs/GAME_DESIGN_DOCUMENT.md).

## Current state: Pip Lab

The first milestone is **Pip**, the procedurally generated creature, plus the **Pip Lab** tuning page (GDD §9.4).

- Pip is drawn entirely in code from a *genome*: hatch seed, life stage, form, mood and four stats (Intellect, Craft, Heart, Authority).
- Body parts grow continuously with each stat, and each stat tier unlocks generated details (glasses, tool belt, heart aura, badge, sash, shield, …).
- The same genome always renders the same Pip, so past seasons' Pips can be redrawn exactly.

## Develop

```bash
npm install
npm run dev        # Pip Lab at http://localhost:5173
npm test           # unit tests
npm run build      # type-check + production build into dist/
npm run sheet      # writes pip-sheet.png, a contact sheet of sample Pips
```

## Project layout

| Path | What it is |
|---|---|
| `src/theme.ts` | All brand colors, fonts and pixel palette ramps (the one file to edit for a rebrand) |
| `src/pip/genome.ts` | Stats, tiers, life stages, and form rules |
| `src/pip/traits.ts` | Seeded random traits that make each Pip unique |
| `src/pip/raster.ts` | Pixel buffer, lit shape filling, dithering and auto-outlines |
| `src/pip/render.ts` | The Pip generator |
| `src/lab/` | The Pip Lab page |

## Deploy

`.github/workflows/deploy.yml` tests, builds and deploys to GitHub Pages on every push to `main`. One-time setup: in the repository's **Settings → Pages**, set **Source** to **GitHub Actions**.
