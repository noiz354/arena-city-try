---
title: "bloodwave — Enemies & Waves"
description: "Zombie chase + 8 wave scaling — repos/bloodwave-fps-game."
---

# bloodwave — Enemies & Waves

Zombie chase + 8 wave scaling — repos/bloodwave-fps-game.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/bloodwave-fps-game/js/enemies.js` [repos/bloodwave-fps-game/js/enemies.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/enemies.js#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/bloodwave-fps-game/js/enemies.js`.

## Audit File

- Primary: `repos/bloodwave-fps-game/js/enemies.js` [repos/bloodwave-fps-game/js/enemies.js](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/js/enemies.js#L1)
- Paritas: `src/systems/EnemySystem.ts` ← `repos/bloodwave-fps-game/js/enemies.js`

## Pattern (Addy Osmani) + Skills relevan

**Observer/Strategy** — wave complete → spawner. **Skill:** `threejs-gameplay-systems`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: spawn batch, cap 30 active.

**Scaffold:** Wave JSON configs.

## Manfaat untuk CITY RUSH

Wave survival untuk missions.
