---
title: "bloodwave-fps-game — Weapons, Enemies & HUD"
description: "Whole clone repos/bloodwave-fps-game — 4 senjata, raycast, zombie 8 wave, HUD+Web Audio. Bermanfaat untuk WeaponSystem & Enemy waves."
---

# bloodwave-fps-game — Weapons, Enemies & HUD

Whole clone repos/bloodwave-fps-game — 4 senjata, raycast, zombie 8 wave, HUD+Web Audio. Bermanfaat untuk WeaponSystem & Enemy waves.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/bloodwave-fps-game` [repos/bloodwave-fps-game](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/bloodwave-fps-game/js/shooting.js` — WEAPONS table, viewmodel, raycast [repos/bloodwave-fps-game/js/shooting.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/shooting.js#L1)
- `repos/bloodwave-fps-game/js/enemies.js` — Zombie chase/attack AI [repos/bloodwave-fps-game/js/enemies.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/enemies.js#L1)
- `repos/bloodwave-fps-game/js/hud.js` — Health/kill feed/vignette [repos/bloodwave-fps-game/js/hud.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/hud.js#L1)
- `repos/bloodwave-fps-game/js/audio.js` — Web Audio pooling [repos/bloodwave-fps-game/js/audio.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/audio.js#L1)

## Architecture Map → CITY RUSH

- `src/systems/WeaponSystem.ts` ← `repos/bloodwave-fps-game/js/shooting.js`
- `src/systems/EnemySystem.ts` ← `repos/bloodwave-fps-game/js/enemies.js`

## Pattern Classify (Addy Osmani)

- **Module** — WEAPONS data table (damage/fireRate/mag).
- **Observer/PubSub** — kill → HUD+audio.
- **Strategy** — raycast vs shotgun pellets.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: hitscan per shot only; AudioNode pool on gesture; HUD batched.

**Scaffold (Yeoman/Vite):** Vanilla `index.html` + `js/` → Vite bundle `src/main.ts:30`.

## Extension Playbook — Load when + Skills relevan

**Load when:** senjata hitscan / wave spawner / HUD. **Skills:** `threejs-gameplay-systems` → `game-feel` → `threejs-audio-generator`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/bloodwave-fps-game` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game`.
