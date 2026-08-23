---
title: "openworld-js — Chunk Streaming & Hooks"
description: "Whole clone repos/openworld-js — 432 files, DPZ 0-5 spatial grid, hooks bus, dual-loop Cannon. Manfaat utama untuk ChunkManager CITY RUSH."
---

# openworld-js — Chunk Streaming & Hooks

Whole clone repos/openworld-js — 432 files, DPZ 0-5 spatial grid, hooks bus, dual-loop Cannon. Manfaat utama untuk ChunkManager CITY RUSH.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/openworld-js` [repos/openworld-js](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/openworld-js/src/obj/chunkManager.js` — DPZ 0=10km→5=1m, 3x3 activate [repos/openworld-js/src/obj/chunkManager.js](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js/src/obj/chunkManager.js#L1)
- `repos/openworld-js/src/common/hooks.js` — Event hook bus [repos/openworld-js/src/common/hooks.js](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js/src/common/hooks.js#L1)
- `repos/openworld-js/src/core/main.js` — Cannon + dual loops [repos/openworld-js/src/core/main.js](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js/src/core/main.js#L1)
- `repos/openworld-js/src/player/control.js` — FPS pointer-lock [repos/openworld-js/src/player/control.js](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js/src/player/control.js#L1)

## Architecture Map → CITY RUSH

- `src/systems/ChunkManager.ts` ← `repos/openworld-js/src/obj/chunkManager.js`
- `src/systems/Vegetation.ts` ← `repos/openworld-js/src/common/hooks.js`

## Pattern Classify (Addy Osmani)

- **Facade** — ChunkManager hide DPZ behind computeCell→activate.
- **Mediator** — hooks.js.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: 5x5 active (`ChunkManager.ts:98 FULL_RADIUS=1`); DPZ push/route.

**Scaffold (Yeoman/Vite):** `package.json` + `vite` + `cannon`; `index.html:1`.

## Extension Playbook — Load when + Skills relevan

**Load when:** open-world streaming / plugin hooks. **Skills:** `level-design` + `performance-optimization` + `threejs-debug-profiler`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/openworld-js` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js`.
