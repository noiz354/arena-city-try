---
title: "Langenium — Missiles & Chase Camera"
description: "Missile 5m hit + chase cam — repos/Langenium."
---

# Langenium — Missiles & Chase Camera

Missile 5m hit + chase cam — repos/Langenium.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/Langenium/game/src/objects/projectiles/missile.ts` [repos/Langenium/game/src/objects/projectiles/missile.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/objects/projectiles/missile.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/Langenium/game/src/objects/projectiles/missile.ts`.

## Audit File

- Primary: `repos/Langenium/game/src/objects/projectiles/missile.ts` [repos/Langenium/game/src/objects/projectiles/missile.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/objects/projectiles/missile.ts#L1)
- Paritas: `src/systems/CameraRig.ts` ← `repos/Langenium/game/src/objects/projectiles/missile.ts`

## Pattern (Addy Osmani) + Skills relevan

**Strategy** — homing vs ballistic. **Skill:** `camera-systems`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: pool 20 missile; cam slerp quat.

**Scaffold:** Missile class + `scenograph/cameras.js:1`.

## Manfaat untuk CITY RUSH

Kejar kamera untuk Vehicle.
