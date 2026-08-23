# CityGenerator

## Purpose

Pure, stateless procedural content generator for the city. Given a chunk coordinate pair it deterministically produces a list of building specs and prop specs (`ChunkContent`); it creates no Three.js objects itself. Because generation is seeded from the chunk coordinates (mulberry32 PRNG, `src/systems/CityGenerator.ts:33-43`), the same chunk always regenerates identical content across activate/deactivate cycles (`src/systems/CityGenerator.ts:82-89`). It also exports all city-layout constants used by the rest of the game (block grid, road centers, chunk grid extents, landmark tower position).

## Execution Flow

- **No init and no per-frame behavior.** The module has no class; everything is exported functions/constants consumed by `ChunkManager` at chunk-build time.
- `generateChunk(cx, cz)` is called once per chunk by `ChunkManager.buildChunk` when a chunk first becomes visible (`src/systems/ChunkManager.ts:215`, `src/systems/ChunkManager.ts:227`). Generation order inside the function matters because every draw from the shared RNG shifts all subsequent values:
  1. Seed: `chunkSeed(cx, cz)` hashes `(cx,cz)` via `cx*374761393 + cz*668265263`, xor-shift 13, multiply `1274126177`, xor-shift 16 (`src/systems/CityGenerator.ts:45-50`), then feeds mulberry32 (`src/systems/CityGenerator.ts:90-91`).
  2. **Landmark tower**: emitted into exactly one chunk — the one containing world point `(TOWER_X, TOWER_Z)=(20,20)`, found by `floor((TOWER_X + CHUNK_GRID_HALF)/CHUNK_SIZE)` (`src/systems/CityGenerator.ts:100-112`). The tower deliberately does NOT sit at the origin so it doesn't block the spawn intersection (BUG-001/002 history in comment `src/systems/CityGenerator.ts:15-21`).
  3. **Block scan**: iterates the 3×3 neighborhood of city blocks around the chunk's center block (`bc,bz ∈ [-1..1]`, `src/systems/CityGenerator.ts:115-119`); out-of-city blocks are skipped (`src/systems/CityGenerator.ts:120`).
  4. **Plots**: each valid 30m block splits into 2×2 plots of size `(BLOCK_SIZE-3)/2 = 13.5m` with a 1.5m margin to roads (`src/systems/CityGenerator.ts:127-131`). A plot belongs to whichever chunk contains its center — ownership guard at `src/systems/CityGenerator.ts:133-135` — so each plot is processed by exactly one chunk.
  5. Plots overlapping the tower footprint (clearance radius `TOWER_SIZE/2 + plotSize/2 = 8+6.75 = 14.75m`) are skipped per-plot, not per-chunk (`src/systems/CityGenerator.ts:137-140`).
  6. Building roll: 70% chance per plot (`rng() < 0.7`, `src/systems/CityGenerator.ts:142`); width/depth lerp between 75%–95% of plot size (`src/systems/CityGenerator.ts:146-147`); height `floor(lerp(8,40,rng()**1.6)/3)*3+6` → discrete 12–42m in 3m steps, biased low by the `**1.6` exponent (`src/systems/CityGenerator.ts:148`); color picked from a fixed 7-entry palette (`src/systems/CityGenerator.ts:98,149`).
  7. Plot-attached props: a streetlight at the block corner nearest plot(0,0) — always, on every block (`pi==0 && pj==0`, `src/systems/CityGenerator.ts:154-156`) — and a hydrant on the opposite corner for plot(1,1), 50% chance (`src/systems/CityGenerator.ts:158-160`).
  8. **Scatter props** run once per valid neighborhood block (so quantity scales with how many of the 9 neighborhood blocks are inside the city): trees 1–4 sampled uniformly in the chunk rect but *kept only if the point IS on a road* (`if (!inRoad(...)) continue`, `src/systems/CityGenerator.ts:166-172`); bushes 1–4 kept only if NOT on road (`src/systems/CityGenerator.ts:175-181`); rock 40% chance, off-road (`src/systems/CityGenerator.ts:184-188`); bench 30% chance, ON road/sidewalk (`src/systems/CityGenerator.ts:191-195`). Note scatter positions are sampled within the chunk's own 16×16m footprint (`worldMinX + rng()*CHUNK_SIZE`, `src/systems/CityGenerator.ts:168-169`), not within the block, so neighboring chunks never duplicate the same scatter point.
- `inRoad(x,z)` classifies a point as road when its local coordinate inside the 40m cell is ≥ BLOCK_SIZE (i.e. inside the trailing 10m road strip of either axis) (`src/systems/CityGenerator.ts:74-80`).

## Data Structures

- `BuildingSpec { cx, cz, w, d, h, color }` — center-world-x/z, footprint, height, hex color (`src/systems/CityGenerator.ts:52-59`).
- `PropSpec { kind, x, z, rot }` — `kind ∈ 'streetlight'|'tree'|'bush'|'hydrant'|'bench'|'rock'`, world position, Y rotation (`src/systems/CityGenerator.ts:61-66`).
- `ChunkContent { buildings: BuildingSpec[]; props: PropSpec[] }` — return payload (`src/systems/CityGenerator.ts:68-71`).
- `ROADS_X` / `ROADS_Z`: 7 road centerlines per axis (BLOCK_COUNT−1), computed as `i*CELL − CITY_HALF + BLOCK_SIZE + ROAD_WIDTH/2` → symmetric positions ±120, ±80, ±40, 0 (`src/systems/CityGenerator.ts:28-31`). Currently informational/exported; ground rendering recomputes road strips independently in `World.buildGround` (`src/game/World.ts:152-178`).

## Public API

- `generateChunk(cx: number, cz: number): ChunkContent` — deterministic content for chunk cell `(cx,cz)` in the chunk grid (`src/systems/CityGenerator.ts:90`).
- `seededRng(seed: number): () => number` — mulberry32 PRNG factory returning a `0..1` function (`src/systems/CityGenerator.ts:34`).
- `chunkSeed(cx: number, cz: number): number` — 2D integer coords → uint32 seed hash (`src/systems/CityGenerator.ts:45`).
- Constants: `BLOCK_SIZE=30`, `ROAD_WIDTH=10`, `CELL=40`, `BLOCK_COUNT=8`, `CITY_SIZE=310`, `CITY_HALF=155`, `CHUNK_SIZE=16`, `CHUNK_COUNT=Math.ceil(310/16)+2=22`, `CHUNK_GRID_HALF=(22*16)/2=176`, `CHUNK_CENTER=Math.floor(176/16)=11` (`src/systems/CityGenerator.ts:4-13`); `TOWER_X=TOWER_Z=20`, `TOWER_SIZE=16`, `TOWER_HEIGHT=72` (`src/systems/CityGenerator.ts:22-25`).

## Interactions

- **Called by**: `ChunkManager.buildChunk` → `generateChunk(chunk.cx, chunk.cz)` (`src/systems/ChunkManager.ts:227`); ChunkManager imports `CHUNK_COUNT`, `CHUNK_GRID_HALF`, `CHUNK_SIZE`, `generateChunk` and the spec types (`src/systems/ChunkManager.ts:18-26`).
- **Constants consumed by World**: `BLOCK_COUNT`, `CELL`, `CITY_HALF`, `CITY_SIZE`, `ROAD_WIDTH` drive the baked ground CanvasTexture (`src/game/World.ts:19`, `src/game/World.ts:145-177`).
- No Three.js imports except `MathUtils.lerp` (`src/systems/CityGenerator.ts:1`) — the module is renderer-agnostic.

## Tuning & Extension Points

- City density/dimensions: `BLOCK_SIZE=30`, `ROAD_WIDTH=10` → `CELL=40`; city grows to ~310m with `BLOCK_COUNT=8` (`src/systems/CityGenerator.ts:4-9`).
- Streaming granularity: `CHUNK_SIZE=16`; `CHUNK_COUNT=22` includes +2 margin chunks beyond the ceil division so the grid (±176m) fully covers the city (±155m) plus road shoulders (`src/systems/CityGenerator.ts:10-12`).
- Building probability: `0.7` per plot (`src/systems/CityGenerator.ts:142`); height distribution curve exponent `1.6` and 3m floor quantization (`src/systems/CityGenerator.ts:148`).
- Prop rates: hydrant 0.5 (`src/systems/CityGenerator.ts:158`), rock 0.4 (`src/systems/CityGenerator.ts:184`), bench 0.3 (`src/systems/CityGenerator.ts:191`); tree/bush counts `1 + floor(rng()*4)` (`src/systems/CityGenerator.ts:166,175`).
- Landmark relocation: move `TOWER_X/TOWER_Z/TOWER_SIZE/TOWER_HEIGHT` (`src/systems/CityGenerator.ts:22-25`); both the tower emission and the per-plot clearance check derive from these constants.
- Determinism caveat: content specs are stable, but the lit-window pattern baked once into the shared window texture uses `Math.random()` at texture creation time (`src/systems/ChunkManager.ts:74`) and differs per session.

## Unresolved

- `ROADS_X`/`ROADS_Z` are exported but no consumer was found outside CityGenerator itself (traffic/pedestrian systems do not import them) — possibly reserved for future lane-following AI.
- Scatter-prop yield per chunk varies ×9 with how many neighborhood blocks pass the bounds test near the city edge; there is no normalization to keep prop density constant at the frontier.
