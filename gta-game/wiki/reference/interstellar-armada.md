---
title: "interstellar-armada — Physics, Weapons & AI Pilots"
description: "Whole clone repos/interstellar-armada — 1265 files, Newtonian physics, equipment cooldowns, pools, AI pilots. Manfaat untuk flight model CITY RUSH."
---

# interstellar-armada — Physics, Weapons & AI Pilots

Whole clone repos/interstellar-armada — 1265 files, Newtonian physics, equipment cooldowns, pools, AI pilots. Manfaat untuk flight model CITY RUSH.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/interstellar-armada` [repos/interstellar-armada](https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/interstellar-armada/src/js/modules/physics.js` — Newtonian force/torque/drag [repos/interstellar-armada/src/js/modules/physics.js](https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada/src/js/modules/physics.js#L1)
- `repos/interstellar-armada/src/js/armada/logic/ai.js` — Fighter/ship AI attack run [repos/interstellar-armada/src/js/armada/logic/ai.js](https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada/src/js/armada/logic/ai.js#L1)
- `repos/interstellar-armada/src/js/modules/pools.js` — Projectile pools [repos/interstellar-armada/src/js/modules/pools.js](https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada/src/js/modules/pools.js#L1)
- `repos/interstellar-armada/src/js/modules/camera-controller.js` — Velocity 6DOF cam [repos/interstellar-armada/src/js/modules/camera-controller.js](https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada/src/js/modules/camera-controller.js#L1)

## Architecture Map → CITY RUSH

- `src/entities/Vehicle.ts` ← `repos/interstellar-armada/src/js/modules/physics.js`
- `src/systems/EnemySystem.ts` ← `repos/interstellar-armada/src/js/armada/logic/ai.js`

## Pattern Classify (Addy Osmani)

- **Strategy** — per-ship drag curves.
- **Pool/State** — AI FSM attack-run.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: pools 200 cap, Verlet integrate max 2 substeps.

**Scaffold (Yeoman/Vite):** `Gruntfile.js` → Vite; `main.js:1` descriptor.

## Extension Playbook — Load when + Skills relevan

**Load when:** Newtonian flight / AI pilots. **Skills:** `physics-tuning` → `game-ai` → `camera-systems`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/interstellar-armada` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada`.
