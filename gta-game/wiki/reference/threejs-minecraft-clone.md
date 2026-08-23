---
title: "threejs-minecraft-clone — Vite Scaffold"
description: "Whole clone repos/threejs-minecraft-clone — 37 files, vite+TS vanilla-ts, toolbar overlay. Scaffold baku CITY RUSH."
---

# threejs-minecraft-clone — Vite Scaffold

Whole clone repos/threejs-minecraft-clone — 37 files, vite+TS vanilla-ts, toolbar overlay. Scaffold baku CITY RUSH.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/threejs-minecraft-clone` [repos/threejs-minecraft-clone](https://github.com/noiz354/arena-city-try/blob/main/repos/threejs-minecraft-clone#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/threejs-minecraft-clone/index.html` — Toolbar overlay HTML [repos/threejs-minecraft-clone/index.html](https://github.com/noiz354/arena-city-try/blob/main/repos/threejs-minecraft-clone/index.html#L1)
- `repos/threejs-minecraft-clone/vite.config.js` — Vite config [repos/threejs-minecraft-clone/vite.config.js](https://github.com/noiz354/arena-city-try/blob/main/repos/threejs-minecraft-clone/vite.config.js#L1)
- `repos/threejs-minecraft-clone/package.json` — three@0.172 + vite@6 [repos/threejs-minecraft-clone/package.json](https://github.com/noiz354/arena-city-try/blob/main/repos/threejs-minecraft-clone/package.json#L1)

## Architecture Map → CITY RUSH

- `src/main.ts` ← `repos/threejs-minecraft-clone/index.html`
- `vite.config.ts` ← `repos/threejs-minecraft-clone/vite.config.js`

## Pattern Classify (Addy Osmani)

- **Scaffold (Yeoman)** — `npm create vite --template vanilla-ts` + three.
- **Module** — ESM via Vite.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: bundle <200kB gz; toolbar DOM outside canvas.

**Scaffold (Yeoman/Vite):** Canonical — `gta-game/src/main.ts` bootstraps exactly this; `vite.config.ts:8` GH_PAGES base.

## Extension Playbook — Load when + Skills relevan

**Load when:** start new project. **Skills:** `threejs-scene-setup` → `threejs-materials-lighting` → `threejs-gltf-loading`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/threejs-minecraft-clone` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/threejs-minecraft-clone`.
