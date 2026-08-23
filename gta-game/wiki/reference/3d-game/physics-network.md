---
title: "3d-game — Physics & Network"
description: "Cannon + socket.io — repos/3d-game."
---

# 3d-game — Physics & Network

Cannon + socket.io — repos/3d-game.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/3d-game/js/game/components/physics.js` [repos/3d-game/js/game/components/physics.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/physics.js#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/3d-game/js/game/components/physics.js`.

## Audit File

- Primary: `repos/3d-game/js/game/components/physics.js` [repos/3d-game/js/game/components/physics.js](https://github.com/noiz354/arena-city-try/blob/main/repos/3d-game/js/game/components/physics.js#L1)
- Paritas: `src/game/World.ts` ← `repos/3d-game/js/game/components/network.js`

## Pattern (Addy Osmani) + Skills relevan

**Observer** — broadcast players. **Skill:** `threejs-scene-setup`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: 1/60 fixed; 20Hz socket.

**Scaffold:** `physics.js`+`network.js`.

## Manfaat untuk CITY RUSH

Sync MP ringan.
