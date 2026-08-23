---
title: "Langenium — Aircraft, Scanners & NPC Pursuit"
description: "Whole clone repos/Langenium — aircraft physics, YUKA NPC vision/pursue, scanner FSM, missile hit, chase cam. Bermanfaat untuk kendaraan terbang CITY RUSH."
---

# Langenium — Aircraft, Scanners & NPC Pursuit

Whole clone repos/Langenium — aircraft physics, YUKA NPC vision/pursue, scanner FSM, missile hit, chase cam. Bermanfaat untuk kendaraan terbang CITY RUSH.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/Langenium` [repos/Langenium](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/Langenium/game/src/objects/aircraft/base.ts` — Base aircraft velocity/throttle/drag/heading [repos/Langenium/game/src/objects/aircraft/base.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/objects/aircraft/base.ts#L1)
- `repos/Langenium/game/src/actors/pirate.ts` — Pirate patrol→pursue AI (YUKA) [repos/Langenium/game/src/actors/pirate.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/actors/pirate.ts#L1)
- `repos/Langenium/game/src/systems/scanners.ts` — Vision-cone scan/lock/track FSM [repos/Langenium/game/src/systems/scanners.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/systems/scanners.ts#L1)
- `repos/Langenium/game/src/objects/projectiles/missile.ts` — Missile 5m hit detection [repos/Langenium/game/src/objects/projectiles/missile.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/objects/projectiles/missile.ts#L1)

## Architecture Map → CITY RUSH

- `src/systems/TrafficSystem.ts` ← `repos/Langenium/game/src/systems/scanners.ts`
- `src/entities/Vehicle.ts` ← `repos/Langenium/game/src/objects/aircraft/base.ts`

## Pattern Classify (Addy Osmani)

- **Observer** — scanner publish target → weapon subscribe (`scanners.ts`).
- **State** — pirate patrol→pursue→evade stack.
- **Strategy** — Raven override Base stats.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: lazy-load GLB setelah FCP, pool missile 20, <30 draw calls 60fps.

**Scaffold (Yeoman/Vite):** `game/` + `client/` + `server/`; `npm create vite --template vanilla-ts` → `three@0.172`.

## Extension Playbook — Load when + Skills relevan

**Load when:** bangun kendaraan terbang / dogfight / pengejaran. **Skills:** `threejs-gameplay-systems` → `physics-tuning` → `camera-systems` (chase cam). Lihat `skills/Langenium.md` (mirror).

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/Langenium` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium`.
