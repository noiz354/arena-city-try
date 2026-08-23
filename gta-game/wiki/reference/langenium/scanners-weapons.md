---
title: "Langenium — Scanners & Weapons"
description: "Vision cone scan/lock/track + cooldown — repos/Langenium."
---

# Langenium — Scanners & Weapons

Vision cone scan/lock/track + cooldown — repos/Langenium.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/Langenium/game/src/systems/scanners.ts` [repos/Langenium/game/src/systems/scanners.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/systems/scanners.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/Langenium/game/src/systems/scanners.ts`.

## Audit File

- Primary: `repos/Langenium/game/src/systems/scanners.ts` [repos/Langenium/game/src/systems/scanners.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/systems/scanners.ts#L1)
- Paritas: `src/systems/WantedSystem.ts` ← `repos/Langenium/game/src/systems/scanners.ts`

## Pattern (Addy Osmani) + Skills relevan

**Observer/Command** — scanner publish → weapon execute. **Skill:** `threejs-gameplay-systems`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: scanner ray 200ms bukan per frame.

**Scaffold:** System base `systems/base.ts:1` timeout.

## Manfaat untuk CITY RUSH

Lock-on senjata untuk WeaponSystem.
