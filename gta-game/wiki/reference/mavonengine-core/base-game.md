---
title: "mavonengine-core — BaseGame & Game"
description: "Headless loop + client shell — repos/mavonengine-core."
---

# mavonengine-core — BaseGame & Game

Headless loop + client shell — repos/mavonengine-core.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/mavonengine-core/packages/core/src/BaseGame.ts` [repos/mavonengine-core/packages/core/src/BaseGame.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/BaseGame.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/mavonengine-core/packages/core/src/BaseGame.ts`.

## Audit File

- Primary: `repos/mavonengine-core/packages/core/src/BaseGame.ts` [repos/mavonengine-core/packages/core/src/BaseGame.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/BaseGame.ts#L1)
- Paritas: `src/game/Game.ts` ← `repos/mavonengine-core/packages/core/src/BaseGame.ts`

## Pattern (Addy Osmani) + Skills relevan

**Template/Facade** — tick→World. **Skill:** `save-systems`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** PRPL: physics 60Hz, RAF independent.

**Scaffold:** BaseGame EventEmitter; monorepo Vite.

## Manfaat untuk CITY RUSH

Loop authoritative untuk MP.
