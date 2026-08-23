# CITY RUSH (gta-game) — Agent Instructions

## Overview

Three.js open-world browser game ("CITY RUSH") built with TypeScript + Vite. Client-only: no backend, no physics engine (hand-rolled collision), seeded deterministic world generation. Entry point is `src/main.ts`, orchestrated by `src/game/Game.ts`.

## Build & Run

```
npm install          # Install dependencies
npm run dev          # Dev server on port 7777 (host 0.0.0.0)
npm run build        # tsc && vite build  (type-checks then bundles)
npm run preview      # Serve production build (port 4173)
npm run typecheck    # tsc --noEmit
```

GitHub Pages builds: set `GH_PAGES=1` so Vite uses base `/arena-city-try/` (see `vite.config.ts`).

## Testing

```
npm test             # Smoke tests (tests/smoke.mjs via tsx)
npm run check        # typecheck + smoke tests — run before every commit
npm run test:visual  # Playwright visual spec against the preview build
npx playwright test  # Same, direct
node tests/playtest.mjs  # Automated playtest bot
```

Playwright auto-builds and serves the production bundle (`playwright.config.ts`). `npm run check` must pass before committing.

## Project Structure

```
src/
├── main.ts         # Boot: error handling, Game creation, HUD/telemetry wiring
├── game/           # Game.ts (loop + update order) and World.ts (scene assembly)
├── entities/       # Player, Vehicle
├── systems/        # 27 gameplay/render systems (one file per system)
├── ui/             # HUD, style.css
├── data/           # Static tables (missions, vehicles, weapons)
├── utils/          # logger, errors, input/raycast helpers
└── analytics/      # tracker, gameTelemetry
tests/              # smoke.mjs, playtest.mjs, visual.spec.ts
docs/wiki/          # Implementation notes with file:line citations (authoritative map of src/)
wiki/catalogue.json # Deep-documentation generation catalogue (spec for producing docs)
```

New gameplay goes in `src/systems/<Name>System.ts`, wired into `src/game/Game.ts` / `World.ts` following the existing update order.

## Code Style

- TypeScript strict mode with `noUnusedLocals` / `noUnusedParameters` — zero unused symbols
- PascalCase classes and system filenames (`WantedSystem.ts`); camelCase for utility modules (`logger.ts`)
- Comments are sparse section markers (`// --- global error handling FIRST ---`); don't narrate obvious code
- Debug console access via exposed globals: `window.game`, `window.tracker` (see `src/main.ts`)

## Documentation

Before analyzing source from zero, read `docs/wiki/index.md` — it maps every subsystem with `file:line` references and flags known doc-vs-code discrepancies. If you move/rename files cited there, update the citations.

## Boundaries

- ✅ **Always do:** Run `npm run check` before committing. Keep new systems as single files under `src/systems/`. Match existing naming conventions.
- ⚠️ **Ask first:** Adding dependencies (only `three` is used at runtime). Changing the per-frame update order in `Game.ts`. Tuning physics/combat constants (they are documented in `docs/wiki/`). Changing the `GH_PAGES` base path.
- 🚫 **Never do:** Commit secrets or credentials. Modify `dist/`, `test-results/`, or `node_modules/`. Delete or rewrite pages in `docs/wiki/` without preserving their file:line citations. Break the public `window.game` debug API.
