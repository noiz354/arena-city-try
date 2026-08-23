---
title: "racing — Vehicle, Track & CPU AI"
description: "Whole clone repos/racing — 92 files, velocity/friction/gravity, Catmull-Rom track, CPU spline. Untuk Traffic & drivable cars."
---

# racing — Vehicle, Track & CPU AI

Whole clone repos/racing — 92 files, velocity/friction/gravity, Catmull-Rom track, CPU spline. Untuk Traffic & drivable cars.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/racing` [repos/racing](https://github.com/noiz354/arena-city-try/blob/main/repos/racing#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/racing/src/objects/Vehicle.ts` — velocity/gravity/raycast/turning [repos/racing/src/objects/Vehicle.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/racing/src/objects/Vehicle.ts#L1)
- `repos/racing/src/objects/Track.ts` — Catmull-Rom spline [repos/racing/src/objects/Track.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/racing/src/objects/Track.ts#L1)
- `repos/racing/src/objects/CPU.ts` — Vector path-following [repos/racing/src/objects/CPU.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/racing/src/objects/CPU.ts#L1)
- `repos/racing/src/scenes/GameScene.ts` — Countdown/Bloom [repos/racing/src/scenes/GameScene.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/racing/src/scenes/GameScene.ts#L1)

## Architecture Map → CITY RUSH

- `src/entities/Vehicle.ts` ← `repos/racing/src/objects/Vehicle.ts`
- `src/systems/TrafficSystem.ts` ← `repos/racing/src/objects/CPU.ts`

## Pattern Classify (Addy Osmani)

- **Data-driven** — VehicleData/speeder_1.ts.
- **Strategy** — CPU follow t.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: spline baked 100 pts; Bloom toggle per tier.

**Scaffold (Yeoman/Vite):** `webpack.config.js` → Vite; `src/` + `data/` + `package.json`.

## Extension Playbook — Load when + Skills relevan

**Load when:** mobil + CPU traffic. **Skills:** `threejs-gameplay-systems` + `level-design`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/racing` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/racing`.
