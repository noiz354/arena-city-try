---
title: "Edelweiss — Controller, Camera & Streaming"
description: "Whole clone repos/Edelweiss — 90 files, inertia/wall-climb/glide, stamina, wall-avoid cam, GLB streaming, 4-tier Optimizer."
---

# Edelweiss — Controller, Camera & Streaming

Whole clone repos/Edelweiss — 90 files, inertia/wall-climb/glide, stamina, wall-avoid cam, GLB streaming, 4-tier Optimizer.

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Sumber whole clone `repos/Edelweiss` [repos/Edelweiss](https://github.com/noiz354/arena-city-try/blob/main/repos/Edelweiss#L1) — katalog `wiki/catalogue.json` keep `arena-city-try/main` per `wiki/catalogue.json:5`.

## Audit — What it ships (whole clone)

- `repos/Edelweiss/public/js/controler.js` — Inertia climb/glide FSM [repos/Edelweiss/public/js/controler.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Edelweiss/public/js/controler.js#L1)
- `repos/Edelweiss/public/js/CameraControl.js` — Wall-avoid yaw/dodge [repos/Edelweiss/public/js/CameraControl.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Edelweiss/public/js/CameraControl.js#L1)
- `repos/Edelweiss/public/js/MapManager.js` — GLB chunk/zone [repos/Edelweiss/public/js/MapManager.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Edelweiss/public/js/MapManager.js#L1)
- `repos/Edelweiss/public/js/Optimizer.js` — 4-tier FPS scaling [repos/Edelweiss/public/js/Optimizer.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Edelweiss/public/js/Optimizer.js#L1)

## Architecture Map → CITY RUSH

- `src/entities/Player.ts` ← `repos/Edelweiss/public/js/controler.js`
- `src/systems/AutoQuality.ts` ← `repos/Edelweiss/public/js/Optimizer.js`

## Pattern Classify (Addy Osmani)

- **Controller/State** — walk→climb→glide FSM.
- **Optimizer/Observer** — FPS → tier.

## Performance Budget (PRPL) & Scaffold

**PRPL:** PRPL: tier drop shadows→postfx→DPR; GLB zone per AABB.

**Scaffold (Yeoman/Vite):** `public/js/` + `app.js:1` → Vite shim; `Optimizer.js:1` → `AutoQuality.ts:13`.

## Extension Playbook — Load when + Skills relevan

**Load when:** stamina on-foot / GLB streaming. **Skills:** `input-systems` + `threejs-debug-profiler`.

## Citations

Whole clone di `D:/Downloads/22-8-26-threejs/repos/Edelweiss` (110 repos). Stub `gta-game-toolkit/reference/` dibiarkan (read-only). Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/Edelweiss`.
