---
title: "Langenium — Actors & Pirate AI"
description: "Actor YUKA + pirate patrol→pursue — repos/Langenium."
---

# Langenium — Actors & Pirate AI

Actor YUKA + pirate patrol→pursue — repos/Langenium.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/Langenium/game/src/actors/pirate.ts` [repos/Langenium/game/src/actors/pirate.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/actors/pirate.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/Langenium/game/src/actors/pirate.ts`.

## Audit File

- Primary: `repos/Langenium/game/src/actors/pirate.ts` [repos/Langenium/game/src/actors/pirate.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/actors/pirate.ts#L1)
- Paritas: `src/systems/EnemySystem.ts` ← `repos/Langenium/game/src/actors/pirate.ts`

## Pattern (Addy Osmani) + Skills relevan

**State** — patrol→pursue; **Observer** — scanner events. **Skill:** `game-ai`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: YUKA update O(n), cap 8 AI.

**Scaffold:** Actor extends BaseActor; state stack `World/Actor.ts:1`.

## Manfaat untuk CITY RUSH

NPC kejar-kejaran untuk WantedSystem.
