---
title: "Langenium — Aircraft Physics (Base & Raven)"
description: "Base aircraft velocity/throttle/drag; Raven overrides — whole clone repos/Langenium."
---

# Langenium — Aircraft Physics (Base & Raven)

Base aircraft velocity/throttle/drag; Raven overrides — whole clone repos/Langenium.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/Langenium/game/src/objects/aircraft/base.ts` [repos/Langenium/game/src/objects/aircraft/base.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/objects/aircraft/base.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/Langenium/game/src/objects/aircraft/base.ts`.

## Audit File

- Primary: `repos/Langenium/game/src/objects/aircraft/base.ts` [repos/Langenium/game/src/objects/aircraft/base.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/game/src/objects/aircraft/base.ts#L1)
- Paritas: `src/entities/Vehicle.ts` ← `repos/Langenium/game/src/objects/aircraft/base.ts`

## Pattern (Addy Osmani) + Skills relevan

**Strategy** — Raven override Base; **Module** — throttle/drag pure fn. **Skill:** `physics-tuning`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: Base preload, Raven delta <5kB gz.

**Scaffold:** `Langenium/game/src/objects/aircraft/base.ts:1` → YUKA Vehicle subclass.

## Manfaat untuk CITY RUSH

Hover/drift tuning untuk Vehicle CITY RUSH.
