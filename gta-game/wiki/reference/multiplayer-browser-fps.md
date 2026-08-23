---
title: "Multiplayer-Browser-FPS — ECS, Shooting & Editor"
description: "Whole clone repos/Multiplayer-Browser-FPS — 116 files, ECS dispatch/subscribe, AABB hitscan, Socket.IO, 3D tile editor."
---

# Multiplayer-Browser-FPS — ECS, Shooting & Editor

Whole clone repos/Multiplayer-Browser-FPS — 116 files, ECS dispatch/subscribe, AABB hitscan, Socket.IO, 3D tile editor.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/Multiplayer-Browser-FPS` [repos/Multiplayer-Browser-FPS](https://github.com/noiz354/arena-city-try/blob/main/repos/Multiplayer-Browser-FPS#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/Multiplayer-Browser-FPS/src/game/game.js` — ECS dispatch/subscribe [repos/Multiplayer-Browser-FPS/src/game/game.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Multiplayer-Browser-FPS/src/game/game.js#L1)
- `repos/Multiplayer-Browser-FPS/src/game/utils.js` — AABB hitScan [repos/Multiplayer-Browser-FPS/src/game/utils.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Multiplayer-Browser-FPS/src/game/utils.js#L1)
- `repos/Multiplayer-Browser-FPS/src/editor-3d/editor.js` — Tile export/import [repos/Multiplayer-Browser-FPS/src/editor-3d/editor.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Multiplayer-Browser-FPS/src/editor-3d/editor.js#L1)

## Architecture Map → CITY RUSH

- `src/systems/WeaponSystem.ts` ← `repos/Multiplayer-Browser-FPS/src/game/update.js`
- `src/data/missions.ts` ← `repos/Multiplayer-Browser-FPS/src/editor-3d/editor.js`

## Pattern Classify (Addy Osmani)

- **ECS/Mediator** — dispatch decouples systems.
- **Strategy** — hitScan ray-aabb.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: ECS pool components; editor JSON not RAF.

**Scaffold (Yeoman/Vite):** `src/` + `dist/` + Express+Socket server.

## Extension Playbook — Load when + Skills relevan

**Load when:** ECS / level editor. **Skills:** `level-design` + `threejs-gameplay-systems`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/Multiplayer-Browser-FPS` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/Multiplayer-Browser-FPS`.
