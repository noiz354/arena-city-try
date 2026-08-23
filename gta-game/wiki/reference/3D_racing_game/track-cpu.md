---
title: "3D_racing_game — Track & CPU"
description: "Catmull-Rom + CPU follow — repos/3D_racing_game (copy penuh dari racing)."
---

# 3D_racing_game — Track & CPU

Catmull-Rom + CPU follow — repos/3D_racing_game. Copy penuh dari `repos/racing` byte-identical.

> Subpage katalog Reference Imports — deep dive file-level dari whole clone `repos/3D_racing_game/src/objects/Track.ts` [repos/3D_racing_game/src/objects/Track.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Track.ts#L1) — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos/3D_racing_game/src/objects/Track.ts`. Alias `repos/racing/src/objects/Track.ts`.

## Audit File

- Primary: `repos/3D_racing_game/src/objects/Track.ts` [repos/3D_racing_game/src/objects/Track.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Track.ts#L1)
- CPU: `repos/3D_racing_game/src/objects/CPU.ts` [repos/3D_racing_game/src/objects/CPU.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/CPU.ts#L1)
- Paritas: `src/systems/TrafficSystem.ts` ← `repos/3D_racing_game/src/objects/CPU.ts` (nextPointIndex + velocity)

## Pattern (Addy Osmani) + Skills relevan

**Strategy** — CPU spline t + Catmull-Rom baked. **Skill:** `level-design` + `threejs-gameplay-systems` → `game-ai`.

## PRPL & Scaffold (Vite/Yeoman)

**PRPL:** 100 baked pts; platform sinus. **Scaffold:** Track + CPU AI, data-driven `data/tracks/track_1.ts`.

## Manfaat untuk CITY RUSH

CPU traffic jalur kota — copy penuh, referensi utama tetap racing.

## Citations

Whole clone `D:/Downloads/22-8-26-threejs/repos/3D_racing_game`, canonical `repos/racing`.
