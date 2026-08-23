---
title: "3D_racing_game — GameScene & Config"
description: "Race loop + Bloom + Data — repos/3D_racing_game (copy penuh dari racing)."
---

# 3D_racing_game — GameScene & Config

Race loop + Bloom + Data — repos/3D_racing_game. Copy penuh dari `repos/racing`.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/3D_racing_game/src/scenes/GameScene.ts` [repos/3D_racing_game/src/scenes/GameScene.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/scenes/GameScene.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/3D_racing_game/src/scenes/GameScene.ts`. Alias `repos/racing/src/scenes/GameScene.ts`.

## Audit File

- Primary: `repos/3D_racing_game/src/scenes/GameScene.ts` [repos/3D_racing_game/src/scenes/GameScene.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/scenes/GameScene.ts#L1)
- Data: `repos/3D_racing_game/data/tracks/track_1.ts` + `repos/3D_racing_game/data/vehicles/speeder_1.ts`
- Paritas: `src/systems/PostFX.ts` ← `repos/3D_racing_game/src/scenes/GameScene.ts` (UnrealBloomPass)

## Pattern (Addy Osmani) + Skills relevan

**Data-driven** — speeder_1 table + VehicleData/TrackData interfaces. **Skill:** `threejs-aaa-graphics-builder` + `threejs-game-ui-designer`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** Bloom per quality tier (1.6 intensity). **Scaffold:** GameScene + EffectComposer, 10 curve segments 4 layers 5 checkpoints.

## Manfaat untuk CITY RUSH

Balap + postfx — copy penuh, sync upgrade three 0.147→0.160 di racing canonical.

## Citations

Whole clone `D:/Downloads/22-8-26-threejs/repos/3D_racing_game`, canonical `repos/racing`.
