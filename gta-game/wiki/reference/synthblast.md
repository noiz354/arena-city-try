---
title: "SYNTHBLAST-threejs-game — Projectiles, Destruction & Drone"
description: "Whole clone repos/SYNTHBLAST-threejs-game — gun/bullet pool, building collapse height-based, drone follow, 102 files + vite.config.js."
---

# SYNTHBLAST-threejs-game — Projectiles, Destruction & Drone

Whole clone repos/SYNTHBLAST-threejs-game — gun/bullet pool, building collapse height-based, drone follow, 102 files + vite.config.js.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/SYNTHBLAST-threejs-game` [repos/SYNTHBLAST-threejs-game](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/SYNTHBLAST-threejs-game/js/classes/Gun.js` — Gun cooldown/spawn [repos/SYNTHBLAST-threejs-game/js/classes/Gun.js](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game/js/classes/Gun.js#L1)
- `repos/SYNTHBLAST-threejs-game/js/classes/Bullet.js` — Bullet velocity/lifetime pool [repos/SYNTHBLAST-threejs-game/js/classes/Bullet.js](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game/js/classes/Bullet.js#L1)
- `repos/SYNTHBLAST-threejs-game/js/classes/Building.js` — Height-based HP collapse [repos/SYNTHBLAST-threejs-game/js/classes/Building.js](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game/js/classes/Building.js#L1)
- `repos/SYNTHBLAST-threejs-game/js/classes/Drone.js` — Formation follow [repos/SYNTHBLAST-threejs-game/js/classes/Drone.js](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game/js/classes/Drone.js#L1)

## Architecture Map → CITY RUSH

- `src/systems/ParticleSystem.ts` ← `repos/SYNTHBLAST-threejs-game/js/classes/Particle.js`
- `src/systems/ChunkManager.ts` ← `repos/SYNTHBLAST-threejs-game/js/classes/Building.js`

## Pattern Classify (Addy Osmani)

- **Factory/Pool** — Gun→Bullet pool; Building reuse geom.
- **Strategy** — homing vs straight.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: pool 100 bullets, pool reuse bukan alloc per frame.

**Scaffold (Yeoman/Vite):** `vite.config.js:1` + `three` + `Hero.js` perspective toggle → `ModeController`.

## Extension Playbook — Load when + Skills relevan

**Load when:** kota destructible / drone companion. **Skills:** `threejs-aaa-graphics-builder` + `performance-optimization` + `threejs-gameplay-systems`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/SYNTHBLAST-threejs-game` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game`.
