---
title: "Worldmap — Audit Kota 310m vs 13 Repo"
description: "CITY RUSH CityGenerator/ChunkManager/World/Vegetation vs 13 whole clone repos/ — Addy Osmani Audit→Pattern→Scaffold→PRPL→Document."
---

# Worldmap — Audit Kota 310m vs 13 Repo

> **Addy Osmani:** Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL → Document. Kota `310×310m` `22×22=484 chunk` `seededRng mulberry32` — bandingkan 13 whole clone `repos/` (keep `arena-city-try/main` per `wiki/catalogue.json:5`). Disk truth `D:/Downloads/22-8-26-threejs/repos`.

## Audit — CITY RUSH apa yang dibuild

**Sumber commit:** `src/systems/CityGenerator.ts:4-13` [CityGenerator.ts:4](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js#L1) — kota bounded, deterministik, LOD 25 aktif.

| Konstanta | Nilai | Derivasi | Cite |
|---|---|---|---|
| `CELL` | 40m | `BLOCK_SIZE 30 + ROAD_WIDTH 10` | `src/systems/CityGenerator.ts:6` |
| `CITY_SIZE` | 310m | `8*30 + 7*10` | `CityGenerator.ts:8` |
| `CITY_HALF` | 155m | `/2` | `CityGenerator.ts:9` |
| `CHUNK_SIZE` | 16m | fixed | `CityGenerator.ts:10` |
| `CHUNK_COUNT` | 22/axis | `ceil(310/16)=20 +2 margin` | `CityGenerator.ts:11` |
| `CHUNK_GRID_HALF` | 176m | `22*16/2` | `CityGenerator.ts:12` |
| `Total chunk` | 484 | `22²` prealloc `ChunkManager.ts:106` | `CityGenerator.ts:11` |

**Mapping:** `chunkWorldX = cx*16-176` `ChunkManager.ts:129-135` [ChunkManager.ts:129](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/ChunkManager.ts#L129) — `worldToChunk = floor((x+176)/16)` `ChunkManager.ts:138-143` — `generateChunk worldMin = cx*16-176` `CityGenerator.ts:95-96`.

**Determinisme:** `seededRng mulberry32` `CityGenerator.ts:34-43` [CityGenerator.ts:34](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/CityGenerator.ts#L34) + `chunkSeed` hash 2D `CityGenerator.ts:45-50` → `generateChunk(cx,cz)` `CityGenerator.ts:90-91` sama seed→sama `ChunkContent`. `buildChunk` sekali per chunk ever activated `ChunkManager.ts:227` tidak rebuild; `dispose` hanya `Game destroy` `ChunkManager.ts:198-202`. Yield `256 plot *0.7 ≈179` bangunan, `palette 7` `CityGenerator.ts:98`, `plotSize 13.5` `CityGenerator.ts:127`, guard `if plotCx outside chunk → continue` `CityGenerator.ts:133-135` (satu chunk own satu plot), `towerClear 14.75m` `CityGenerator.ts:139-140`.

**Tower 20,20:** `TOWER_X/Z 20 SIZE 16 HEIGHT 72` `CityGenerator.ts:22-25` [CityGenerator.ts:22](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/CityGenerator.ts#L22) — komentar `CityGenerator.ts:15-21` tower di NE central block bukan `(0,0)` clear intersection spawn (fix `PLAYTEST_BUGS BUG-001/002`). Assignment `towerCx = floor((20+176)/16)` `CityGenerator.ts:101-112`.

**Scatter ponytail fix 9×→1×:** `// ponytail: was inside bc/bz loop → 9x density, now 1x + minDist` `CityGenerator.ts:167` — `tooClose O(n²)` `CityGenerator.ts:168-173`, `treeCount 2+floor(rng*3)=2-4` `CityGenerator.ts:176` `inRoad` `CityGenerator.ts:74-80`, sidewalk snap 1–2.5m `CityGenerator.ts:182-190`, `tooClose 5m` `:191`, bush `2+floor(rng*2)` `CityGenerator.ts:197`, rock 35% `CityGenerator.ts:206`, bench 25% `CityGenerator.ts:212`.

**LOD:** `FULL_RADIUS 1` `SIMPLE_RADIUS 2` `ChunkManager.ts:29-34` [ChunkManager.ts:29](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/ChunkManager.ts#L29) — `d=max(|Δcx|,|Δcz|)` `ChunkManager.ts:151-152` → `level 2 full` `buildBoxGeometry` `ChunkManager.ts:258-286` `windowTex repeat max(1,round(w/4)),max(1,round(h/3))` `:263` + `simpleInstances InstancedMesh(1,1,1)` 1 draw/chunk `ChunkManager.ts:289-306` [ChunkManager.ts:289](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/ChunkManager.ts#L289) — interior `activeCount 25` `ChunkManager.ts:165-169` (9 full +16 simple 16 draw vs ~100+). Build once `ChunkManager.ts:225-256`. Window texture 256px 65% lit `ChunkManager.ts:58-87`.

**Culling:** Traffic 100m `TrafficSystem.ts:121-123` [TrafficSystem.ts:121](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/TrafficSystem.ts#L121) — Parked 95m `VehicleManager.ts:44-49` — Chunk ring-based `d>2 hidden` `ChunkManager.ts:152` → 32m axis. `Fog 90-420` `World.ts:40`. Vegetation `frustumCulled false` `Vegetation.ts:39` 24k blades `Vegetation.ts:14-16,34-76` ring 280-760m 1 InstancedMesh 1 draw.

**Roads:** `ROADS_X/Z` `CityGenerator.ts:28-31` [CityGenerator.ts:28](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/CityGenerator.ts#L28) — `ROADS 7/axis [-120,-80,-40,0,40,80,120]` `TrafficSystem.ts:16` — `roadLines()` `TrafficSystem.ts:8-16` — spawn `lane=ROADS[rand]` `TrafficSystem.ts:61`, `nextLine = ROADS.find(l>coord+1)` `TrafficSystem.ts:160-162`, turn 6m `INTERSECTION_REACH 6` `:19` bug 0% right `docs/wiki/systems/TrafficSystem.md:20`.

**Spatial query:** `grid Map<string,Collidable[]>` `ChunkManager.ts:102-103` — `rebuildActiveCollidables` `ChunkManager.ts:371-391` — `forEachNear/queryCircle r=ceil(radius/16)` `ChunkManager.ts:180-196` [ChunkManager.ts:180](https://github.com/noiz354/arena-city-try/blob/main/gta-game/src/systems/ChunkManager.ts#L180) — consumer LOS `queryCircle 70` `Game.ts:410`.

**Ground/Terrain:** `World.ts:139-203` bake `BLOCK_COUNT/CELL/CITY_HALF` single CanvasTexture 2048 `px(m)=((m+CITY_HALF)/CITY_SIZE)*size` `World.ts:153-155` road 10m sidewalk 1.5m `World.ts:164-168` dashed yellow center `World.ts:171-177`, `PlaneGeometry 350×350` `CITY_SIZE+40` `World.ts:193-194`, outer terrain `1600×1600 96 segs sine` `World.ts:212-240`.

## Reference Map — 13 Repo Lengkap

> Deep cite `repos/<slug>/file#L1` keep `arena-city-try/main` (`wiki/catalogue.json:5`). Disk `D:/Downloads/22-8-26-threejs/repos`.

### Primary — Streaming World

**`repos/openworld-js` — Chunk Streaming DPZ TypedArray (PRIMARY GTA pattern)** [repos/openworld-js/src/obj/chunkManager.js](https://github.com/noiz354/arena-city-try/blob/main/repos/openworld-js/src/obj/chunkManager.js#L1) = reference stub `gta-game-toolkit/reference/openworld-js/src/obj/chunkManager.js#L1`
- `repos/openworld-js/src/obj/chunkManager.js:1` `dynaNodes_lab()` 6-level `gridsize=[10000,200,100,20,5,1]` + `spatialGrid Map<"DPZ_gx_gz"→Set>` 9-cell `floor(pos/size)±1` + `currentlyActiveIndices` diff per frame; `calPosID(x,z,zindex) D2N3`.
- `repos/openworld-js/src/obj/addobj.js:1` `MAX_BODIES 1M Float32Array(MAX*8) positionsStatus[x,y,z,qx,qy,qz,qw,status]` + `physicsProps[mass,w,h,d,DPZ]` `activeTABox()` new `CANNON.Body` `hiddenTABox()` remove — TypedArray pipeline.
- `repos/openworld-js/src/core/animate.js:1` `updataBodylist()` `requestAnimationFrame` calls `dynaNodes_lab()` sync Cannon→TypedArray→`W.move()`, `gridKeyCurrentTime>500ms` re-key; `animatePhy` 75Hz `world.step(1/60)` via `setTimeout`.
- `repos/openworld-js/src/wjs/w.js:1` `WJS` WebGL2 `drawElementsInstanced` `viewLimit 50000`, double-buffer `W.next/current`, `wjsDynamicIns.js` `gl.bufferSubData`.
- **Kaitan:** CITY RUSH `ChunkManager 22×22 25 aktif InstancedMesh 16 draw` adalah DPZ-lite bounded (310m) tanpa TypedArray; adopt `Float32Array(MAX*8)` bila entitas >1k atau infinite kota.

**`repos/mavonengine-core` — Sparse Chunk Skeleton (UNIMPLEMENTED)** [repos/mavonengine-core/packages/core/src/World/BaseChunkManager.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/mavonengine-core/packages/core/src/World/BaseChunkManager.ts#L1)
- `packages/core/src/World/BaseChunkManager.ts:1` `loadedChunks Map<string,Chunk>` + `update→forEach(chunk.update)` + `destroy` — TODO server representation, NO load/unload/stream.
- `packages/core/src/World/Chunk.ts:1` `static CHUNK_SIZE undefined` `id=chunk_x,y` `position.set(x,0,y)` empty `update()`.
- `packages/core/src/BaseGame.ts:1` `setInterval(tick,1000/30)` → `physicsWorld.step()` → `world.update(delta)`.
- **Kaitan:** Arsitektur `Map + per-tick` siap port `openworld-js` DPZ ke TS modern `Rapier+Three` — scaffold `src/systems/ChunkManager.ts` sudah pakai pola `Map` serupa.

### Spline — Roads

**`repos/racing` + `repos/3D_racing_game` (byte-identical 46/46, fork evanbillet)** [repos/racing/src/objects/Track.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/racing/src/objects/Track.ts#L1) = [repos/3D_racing_game/src/objects/Track.ts](https://github.com/noiz354/arena-city-try/blob/main/repos/3D_racing_game/src/objects/Track.ts#L1)
- `repos/racing/src/objects/Track.ts:94` `createCatmullRom()` `new THREE.CatmullRomCurve3(points,closed).getPoints(divisions)` → `ExtrudeGeometry(shape,{extrudePath:curve})`; `createEllipse()` `EllipseCurve→CurvePath+LineCurve3`; `createPathVectors()` `p2-p1 normalized` per division untuk CPU steering.
- `repos/racing/data/tracks/track_1.ts:1` declarative `TrackData{curveData[], layerData[collision invisible,surface,outline], checkpoints[5 h100], signsPoints}` `steps:100-320`.
- `repos/racing/src/objects/CPU.ts:21` `nextPointIndex()` nearest `distanceToSquared` → `pathVectors[pointIndex]` thrust clamp `0.3-0.8`.
- `repos/racing/src/utils/geometry.ts:1` `toVectorArray/toShapeArray` adapter.
- **Kaitan:** CITY RUSH `ROADS 7/axis grid` bisa di-spline-kan via `CatmullRom+Extrude` untuk mission race track; reuse `src/systems/TrackSpline.ts:8` `createPath()` `nextPointIndex()` (copy racing) — `// ponytail: 100 pts baked`.

### Out-of-Scope — Marked Lengkap (7 repo)

**`repos/Langenium` — Fixed Ocean World NO Streaming** [repos/Langenium/client/src/app/scenograph/scenes/overworld.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Langenium/client/src/app/scenograph/scenes/overworld.js#L1)
- `scenes/overworld.js:1` `setup()` hardcode `Sky+Valiant+Raven+Platform @(-35000,-65000)+Extractors+Ocean` queue `animation_queue.push`; `scenograph.js:1` `getGPUTier()` + `setupRenderers(high-performance)` loop `animation_queue[i](delta)`; `ocean.js:1` single `PlaneGeometry(l.scale*2,50,50)` + `Water` shader `submergedObjects extractorLocations`. **Flag out-of-scope:** fixed `±70k` world no chunk/grid.

**`repos/threejs-minecraft-clone` — Stub NO Voxel** [repos/threejs-minecraft-clone/index.html](https://github.com/noiz354/arena-city-try/blob/main/repos/threejs-minecraft-clone/index.html#L1)
- `index.html:47` refs `scripts/main.js` NOT exists; `README.md:25` claims `Infinite Terrain` unimplemented; `skills.md` verdict incomplete. **Flag out-of-scope:** scaffold `three 0.172 vite 6` saja, ignore chunk logic.

**`repos/Astray` — Maze Regenerate (NO Sparse)** [repos/Astray/maze.js](https://github.com/noiz354/arena-city-try/blob/main/repos/Astray/maze.js#L1)
- `maze.js:1` `generateSquareMaze(dim)` DFS backtracker `field[dim][dim]` carve `field[x±2][y]` + wall `field[x±1][y]=false`; `index.html:1` `b2PolygonShape 0.5` per cell merged `GeometryUtils.merge` single `MeshPhongMaterial` `mazeDimension 11→+2 per win`. **Flag out-of-scope:** whole-maze rebuild antitesis streaming.

**`repos/bloodwave-fps-game` — FPS Wave (NO Worldmap)** [repos/bloodwave-fps-game/src/systems](https://github.com/noiz354/arena-city-try/blob/main/repos/bloodwave-fps-game/src/systems#L1) — pattern `shooting.js` hitscan + `WaveSystem` — **flag out-of-scope:** reuse untuk `WeaponSystem` bukan `CityGenerator`.

**`repos/edelweiss` — Hiking Streaming Terrain** [repos/edelweiss/client/src](https://github.com/noiz354/arena-city-try/blob/main/repos/edelweiss/client/src#L1) — `Camera`/`Controller`/`Streaming` (terrain tiles) — partial streaming tapi hiking trail `±?` bukan kota grid — **flag out-of-scope:** terlalu linear, tidak adopt kecuali elevasi.

**`repos/synthblast` — Shooter Level** [repos/synthblast/src](https://github.com/noiz354/arena-city-try/blob/main/repos/synthblast/src#L1) — `gun-bullet` `enemy-drone` — **flag out-of-scope.**

**`repos/interstellar-armada` — Space AI Pools** [repos/interstellar-armada/src](https://github.com/noiz354/arena-city-try/blob/main/repos/interstellar-armada/src#L1) — `ai-pools` `physics-equipment` — **flag out-of-scope.**

**`repos/multiplayer-browser-fps` + `repos/3d-game` (3d-game)** [repos/multiplayer-browser-fps/src](https://github.com/noiz354/arena-city-try/blob/main/repos/multiplayer-browser-fps/src#L1) — `ecs-update` `network-editor` — world `src/systems/ChunkManager` absent — **flag out-of-scope:** ECS/network pattern bukan worldmap (di Sesi 9 `src/ecs/` copy).

## Pattern Classify (Addy Osmani)

- **CITY RUSH:** Factory (`generateChunk` per chunk), Strategy (scatter `tooClose 5/3/4`), Object Pool deferred (`docs/wiki/systems/ChunkManager.md:57` texture clone sink), DPZ-lite bounded. **Skills:** `threejs-gameplay-systems` → `level-design`.
- **openworld-js:** TypedArray SoA + SpatialGrid + DPZ 6-level — Data-driven + Dirty-flag. **Skill:** `threejs-gameplay-systems` + `performance-optimization`.
- **racing:** Strategy (CatmullRom vs Ellipse) + Data-driven `VehicleData/speeder_1`. **Skill:** `threejs-aaa-graphics-builder`.

## Performance Budget (PRPL) & Scaffold

**PRPL CITY RUSH:** `484` chunks `25` aktif `(9 full +16 instanced 16 draw)` total `75-95` draw interior `docs/wiki/systems/ChunkManager.md:31`, `Fog 90-420` hide 176m grid, `shadow ortho ±55 bias -0.0005` texel-snapped `World.ts:51-70,101-118`, `Vegetation 24k 1 draw`. Budget pas `Chrome baseline <100 draw` — keep bounded kota; `openworld-js viewLimit 50000 drawElementsInstanced` baru perlu bila infinite.

**Scaffold (Yeoman/Vite):** `src/systems/CityGenerator.ts` + `ChunkManager.ts` → `World.ts` CanvasTexture bake rocord vs `openworld-js` `WJS wjsDynamicIns` streaming — Vite `src/` + `data/vehicles.ts` + `package.json` three 0.185. Next: `TrackSpline.ts:8` `createPath()` CatmullRom `100 divisions` baked (racing `steps 100-320`).

## Extension Playbook — Load when + Skills relevan

**Load when:** tambah kota >500m → adopt `openworld-js` TypedArray `Float32Array` + `spatialGrid DPZ` + `activeTABox/hiddenTABox`; butuh race road → `racing/Track.ts:94` CatmullRom extrusion; butuh chunk deformasi → `mavonengine-core Chunk.ts` skeleton + dirty-flag.

**Skills:** `threejs-gameplay-systems` → `level-design` + `performance-optimization` + `threejs-aaa-graphics-builder` (track). Mirror `wiki/reference/racing/*` `openworld-js/*`.

## Citations

Whole clone `D:/Downloads/22-8-26-threejs/repos` 110 dirs `Discovered 01a027e8` whole `arena-city-try` — stub `gta-game-toolkit/reference/` read-only. Cites `src/systems/CityGenerator.ts:4,8,11,22,34,45,74,90,133,167,191` `ChunkManager.ts:29,58,102,129,151,165,180,227,289,371` `TrafficSystem.ts:8,16,60,121,160` `World.ts:40,51,139,153` `Game.ts:410`. Mirror URL keep `https://github.com/noiz354/arena-city-try/blob/main/repos/<slug>` per `wiki/catalogue.json:5`.

