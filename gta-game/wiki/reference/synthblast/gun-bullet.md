---
title: "SYNTHBLAST — Gun & Bullet Pooling"
description: "Gun cooldown + Bullet pool — repos/SYNTHBLAST."
---

# SYNTHBLAST — Gun & Bullet Pooling

Gun cooldown + Bullet pool — repos/SYNTHBLAST.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/SYNTHBLAST-threejs-game/js/classes/Gun.js` [repos/SYNTHBLAST-threejs-game/js/classes/Gun.js](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game/js/classes/Gun.js#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/SYNTHBLAST-threejs-game/js/classes/Gun.js`.

## Audit File

- Primary: `repos/SYNTHBLAST-threejs-game/js/classes/Gun.js` [repos/SYNTHBLAST-threejs-game/js/classes/Gun.js](https://github.com/noiz354/arena-city-try/blob/main/repos/SYNTHBLAST-threejs-game/js/classes/Gun.js#L1)
- Paritas: `src/systems/WeaponSystem.ts` ← `repos/SYNTHBLAST-threejs-game/js/classes/Gun.js`

## Pattern (Addy Osmani) + Skills relevan

**Factory/Pool** — Gun.create → pooled Bullet. **Skill:** `performance-optimization`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: pool 100, lifetime 2s.

**Scaffold:** `js/classes/Gun.js:1` fireRate timer.

## Manfaat untuk CITY RUSH

Pool peluru tanpa GC.
