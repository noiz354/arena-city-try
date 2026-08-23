---
title: "3D_racing_game — Racing Variant (evanbillet fork, copy penuh)"
description: "Whole clone repos/3D_racing_game — evanbillet fork byte-identical to leslieyip02/racing (46/46 files same, three 0.147). Copy penuh mirror 3 subpages."
---

# 3D_racing_game — Racing Variant (evanbillet fork, copy penuh)

Whole clone `repos/3D_racing_game` — evanbillet fork byte-identical to `repos/racing` (leslieyip02/racing). `Compare-Object` 46/46 SAME, delta hanya `skills.md` (hanya di racing). Copy penuh: overview + 3 subpages mirror racing penuh, bukan alias thin.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/3D_racing_game` [repos/3D_racing_game/src/objects/Vehicle.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Vehicle.ts#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`. Disk truth `D:/Downloads/22-8-26-threejs/repos/3D_racing_game` (canonical `D:/Downloads/22-8-26-threejs/repos/racing`).

## Audit — What it ships (whole clone, copy penuh)

- `repos/3D_racing_game/src/objects/Vehicle.ts` — velocity/friction/gravity, raycast [repos/3D_racing_game/src/objects/Vehicle.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Vehicle.ts#L1) — alias `repos/racing/src/objects/Vehicle.ts#L1`
- `repos/3D_racing_game/src/objects/Track.ts` — Catmull-Rom spline [repos/3D_racing_game/src/objects/Track.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Track.ts#L1)
- `repos/3D_racing_game/src/objects/CPU.ts` — Vector path-following [repos/3D_racing_game/src/objects/CPU.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/CPU.ts#L1)
- `repos/3D_racing_game/src/scenes/GameScene.ts` — Countdown/Bloom [repos/3D_racing_game/src/scenes/GameScene.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/scenes/GameScene.ts#L1)
- `repos/3D_racing_game/package.json` — three 0.147 webpack mode:none [repos/3D_racing_game/package.json](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/package.json#L1)
- `repos/3D_racing_game/game.html` — Game entry [repos/3D_racing_game/game.html](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/game.html#L1)
- `repos/3D_racing_game/README.md` — site masih leslieyip02.github.io/racing (bukti fork) [repos/3D_racing_game/README.md](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/README.md#L1)

## Architecture Map → CITY RUSH

- `src/entities/Vehicle.ts` ← `repos/3D_racing_game/src/objects/Vehicle.ts` (copy penuh dari racing)
- `src/systems/TrafficSystem.ts` ← `repos/3D_racing_game/src/objects/CPU.ts` (nextPointIndex)
- `src/systems/PostFX.ts` ← `repos/3D_racing_game/src/scenes/GameScene.ts` (Bloom)

## Pattern Classify (Addy Osmani)

- **Data-driven/Strategy** — VehicleData/speeder_1.ts + CPU Strategy override.
- **Factory + God-class** — Track.createCatmullRom vs GameScene 384-line.

## Performance Budget (PRPL) & Scaffold

**PRPL:** Push mode:none no minify; Render UnrealBloomPass 1.6 heavy; Pre-cache ExtrudeGeometry re-extruded; Lazy no draco, dt uncapped — sama persis racing. **Budget CITY RUSH:** upgrade three 0.147→0.160, mode:production + splitChunks, dt=Math.min(dt,50), InstancedMesh stars.

**Scaffold (Yeoman/Vite):** `webpack.config.js` → Vite; `src/` + `data/` + `package.json`. Yeoman `yo threejs-game` scaffold vs copy penuh existing.

## Extension Playbook — Load when + Skills relevan

**Load when:** butuh alternatif racing config / bandingkan fork vs upstream. **Skills:** `threejs-gameplay-systems` → `physics-tuning` + `level-design`. Canonical tetap `skills/racing.md`, `wiki/reference/racing/*` — 3D_racing_game mirror copy penuh untuk jejak 13-repo.

- Subpages: [Vehicle & Player](./3D_racing_game/vehicle-player.md) · [Track & CPU](./3D_racing_game/track-cpu.md) · [GameScene & Config](./3D_racing_game/scene-config.md)

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/3D_racing_game` (evanbillet, 92 files) canonical `D:/Downloads/22-8-26-threejs/repos/racing` (leslieyip02, 92 files + skills.md). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game`. `// ponytail: copy penuh — byte-identical, alias thin skipped; upgrade canonical racing saja`.
