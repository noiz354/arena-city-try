---
title: "3d-game — Camera, Physics & Multiplayer Sync"
description: "Whole clone repos/3d-game — 119 files, wall-clip follow cam, Cannon, socket.io. Alias untuk extra reference/3d-game/."
---

# 3d-game — Camera, Physics & Multiplayer Sync

Whole clone repos/3d-game — 119 files, wall-clip follow cam, Cannon, socket.io. Alias untuk extra reference/3d-game/.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/3d-game` [repos/3d-game](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/3d-game/js/game/components/camera.js` — Wall-clipping follow cam [repos/3d-game/js/game/components/camera.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/camera.js#L1)
- `repos/3d-game/js/game/components/physics.js` — Cannon setup [repos/3d-game/js/game/components/physics.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/physics.js#L1)
- `repos/3d-game/js/game/components/network.js` — Socket.io sync [repos/3d-game/js/game/components/network.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/network.js#L1)

## Architecture Map → CITY RUSH

- `src/systems/CameraRig.ts` ← `repos/3d-game/js/game/components/camera.js`
- `src/game/World.ts` ← `repos/3d-game/js/game/components/network.js`

## Pattern Classify (Addy Osmani)

- **Strategy** — ray-clip vs lerp.
- **Observer** — socket broadcast.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: socket 20Hz, physics 1/60 fixed.

**Scaffold (Yeoman/Vite):** `index.html:1` + `js/` + `css/`; `engine/main.js`.

## Extension Playbook — Load when + Skills relevan

**Load when:** 3rd-person cam / socket MP. **Skills:** `camera-systems` + `threejs-scene-setup` + `threejs-gltf-loading`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/3d-game` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game`.
