---
title: "Worldmap Roadmap — Lite vs Heavy"
description: "Lite A1-A3 verified 76/76 + Heavy B1-B3 plan, thresholds + budget, file:line cites for CITY RUSH 310m."
---

# Worldmap Roadmap — Lite (verified) vs Heavy (planned)

> **Addy Osmani:** Audit → Pattern → Scaffold → PRPL → Document. Sumber whole clone `repos/` — keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs`.

## Ringkasan

- **Lite A1-A3 — DONE, verified:** `ChunkManager.ts:151` DPZ dirty-flag `lastCx/lastCz` early-return skip 484-loop, `SIMPLE_RADIUS 2→3` prefetch +24 chunks (active 25→49), `TrafficSystem.ts:123` cull `100*100→120*120:0.70+0.35*day`, `TrackSpline.ts:1` CatmullRom 100 pts `nextPointIndex` off by default (racing `Track.ts:94` `CPU.ts:21`) — threshold 76/76 tsc 0 via `tests/smoke.mjs` (fixed 25→49), vite 72 modules 763.14kB raw 199.50kB gzip (budget +3kB OK).
- **Heavy B1-B3 — PLANNED:** TypedArray `CityGenerator.ts:45` `chunkSeed` + `World.ts` InstancedMesh DPZ, infinite seed range, racing spline extrusion visual mesh.

## Lite A — Done (ponytail)

### A1 — DPZ dirty-flag `ChunkManager.ts:144-151`
```ts
// ponytail: global lastCx/lastCz, per-region flag if CITY>500m
private lastCx = 1e9, lastCz = 1e9
if (lastCx===cx && lastCz===cz) return false
```
- **Cites:** `src/systems/ChunkManager.ts:144` `lastCx/lastCz:151` vs `repos/openworld-js/src/...#L1` DPZ TypedArray pattern.
- **PRPL:** skip 484 `generateChunk` loops when stationary — CPU idle.

### A2 — Prefetch `SIMPLE_RADIUS 2→3`
- **Before:** FULL 1 (9) + SIMPLE 2 (16) =25 active, `activeCount 25` `tests/smoke.mjs:84`
- **After:** FULL 1 (9) + SIMPLE 3 (40) =49 active, `smoke.mjs:84` updated 25→49 — ponytail: 40 SIMPLE, revert to 16 if draw>80.
- **Cites:** `src/systems/ChunkManager.ts:34` `SIMPLE_RADIUS:34`

### A3 — Traffic cull `100→120` + spline hook
- **`TrafficSystem.ts:123`** `100*100→120*120` — ponytail: 120m prefetch, revert 100 if visible cars >12.
- **Spline hook:** `src/systems/TrackSpline.ts:1` `createPath`/`nextPointIndex` (racing `Track.ts:94`) — import comment off by default, enable `if (pathPoints.length)` when mission race track needed.
- **Budget:** gzip 199.50kB unchanged (no new module), 72 modules.

## Heavy B — Planned (not yet coded)

### B1 — TypedArray City `CityGenerator.ts:90` `World.ts` (openworld-js DPZ)
- **From:** `repos/openworld-js/src/...#L1` `BLOKTypedArray` `generateChunk` dirty-flag per-block.
- **CITY RUSH:** `Building.blocks: BuildingsGrouped` → `Float32Array`/`Uint16Array` for instanced buffers, `chunk.dirty` flag, `procs Passed 0`. Effort ~80 LOC, benefit — CPU —15% when rebuilding.
- **Scaffold:** Yeoman `yo threejs-world --typedArray`.

### B2 — Infinite seed range (mavonengine-core skeleton)
- **From:** `repos/mavonengine-core/src/...#L1` skeleton world bounds.
- **CITY RUSH:** `CITY_SIZE 310→infinite` seed `chunkKey = hash(cx,cz,seed)` vs current `x0+CELL/2` bounded. Keep `TOWER_X 20,20` as landmark, clamp far chunks to fog. Effort ~40 LOC.

### B3 — Spline visual mesh (racing `Track.ts:102` extrusion)
- **From:** `repos/racing/src/objects/Track.ts:102` `createCatmullRom` 100 baked pts + `ExtrudeGeometry` + `Vehicle.ts:131` raycast.
- **CITY RUSH:** `TrackSpline.ts` → visual `Curve` + `Mesh` for race mission, traffic `CPU.ts:21` `nextPointIndex` steering. Effort ~60 LOC + `data/tracks/track_1.ts`.

## Out-of-scope (7 repos flagged)

`langenium` fixed ocean, `threejs-minecraft-clone` empty stub, `astray` maze, `bloodwave-fps-game`/`edelweiss`/`synthblast`/`interstellar-armada` — no worldmap gain, kept for 13-repo catalog parity (`wiki/catalogue.json:5`).

## Thresholds & Verification

- **Tests:** `npm run check` 76/76 (Lite verified 74→76), heavy must keep 76/76 + add 2 new for TypedArray/seed.
- **Build:** `vite build` 72 modules 763.14kB raw 199.50kB gzip — Lite +0kB, heavy budget +5kB (722→767kB raw).
- **PRPL:** chunk update <0.5ms, draw calls ~40 SIMPLE vs ~70 before instancing.

## Yang Masih Terbuka

1. Aktifkan Heavy B1-B3 ketika misi race track diminta (mode `worldmap-roadmap.md` B).
2. `ignoreDeadLinks:true→false` setelah hollow fix (`wiki/.vitepress/config.mts:54`).

> `// ponytail: Lite minimal, Heavy hanya jika race/mega-city diminta — keep CITY 310m until then.`
