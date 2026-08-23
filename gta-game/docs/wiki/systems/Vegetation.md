# Vegetation

## Purpose

Decorative outer-terrain grass field: 24,000 stylized cross-plane blades instanced in a single `InstancedMesh` (one draw call) ringing the flat city square, animated by a custom wind vertex shader with per-blade phase. Fully procedural — no textures or assets ("sandbox-safe", `src/systems/Vegetation.ts:21-27`). It is purely cosmetic: no colliders, no shadows, no gameplay coupling.

## Execution Flow

- **Init (constructor only)**: all placement happens once at construction (`src/systems/Vegetation.ts:34-76`):
  1. Build the shared blade geometry procedurally (`buildBladeGeometry`) and the `ShaderMaterial` bound to a single shared time-uniform object `timeUniform` (`src/systems/Vegetation.ts:35-36`, uniform wiring `139`).
  2. Rejection-sample blade positions inside an annulus around the origin: angle uniform in `[0,2π)`, radius `RING_MIN + sqrt(rand)*(RING_MAX-RING_MIN)` — the square root gives area-uniform density across the ring (`src/systems/Vegetation.ts:50-56`). `RING_MIN=280` starts blades beyond the city's flat ground half-diagonal (~250m, comment at `src/systems/Vegetation.ts:15`); `RING_MAX=760` is the terrain extent (800 half) minus margin.
  3. Each accepted blade is dropped onto the terrain surface exactly: `y = terrainSurfaceY(x,z)`, imported from World so grass follows the eased heightfield including its −0.2 mesh offset (`src/systems/Vegetation.ts:58`, `src/game/World.ts:248-252`).
  4. Per-blade transform: scale `(0.8+rand*0.5, 0.7+rand*0.7, 0.8+rand*0.5)` and random Y rotation composed into one matrix (`src/systems/Vegetation.ts:61-64`).
  5. Per-blade data smuggled through `instanceColor`: r = random wind phase, g = heightScale (b unused) (`src/systems/Vegetation.ts:67-68`).
  6. A guard caps attempts at `BLADE_COUNT * 40` iterations; final placed count written back to `blades.count` (`src/systems/Vegetation.ts:48-50,71`). Placement uses raw `Math.random()` — **non-deterministic per session**, unlike chunk content (contrast with `seededRng` in CityGenerator).
- **Per frame**: `update(time)` does nothing but assign `this.timeUniform.value = time`; all motion is shader-side, matrices are never rewritten after init (`src/systems/Vegetation.ts:78-80`). Called with `clock.elapsedTime` from the main loop (`src/game/Game.ts:447`).
- **Draw**: one InstancedMesh; `frustumCulled = false` because blades span the whole outer ring and a bounding sphere would never cull meaningfully (`src/systems/Vegetation.ts:38-39`). No shadow flags are set → no shadow passes.

## Data Structures

- `root: Group` containing the single `blades: InstancedMesh` (`src/systems/Vegetation.ts:29-30,75`).
- Blade geometry (`src/systems/Vegetation.ts:89-133`): 3 intersecting planes rotated 0°/60°/120° (`planes=3`, `angle=(p/planes)*π`, `src/systems/Vegetation.ts:95,100`), each 4 vertical segments, unit height 1.0, base width 0.06, width taper `pow(1−t,1.4)`, forward lean `t²·0.12` (`src/systems/Vegetation.ts:96-111`). Totals: 30 vertices, 24 triangles per instance. Normals are per-plane fixed `(sin,0.3,cos).normalize()` (`src/systems/Vegetation.ts:103`); UV.y carries normalized height for the root→tip color gradient.
- Material uniforms (`src/systems/Vegetation.ts:138-144`): `uTime` (shared object), `uRootColor 0x5f9a45`, `uTipColor 0xa8d54a`, `uWind 0.35`, `uSun` fixed dir `(-0.4,0.75,0.5)` normalized. `side: 2` (DoubleSide) set numerically (`src/systems/Vegetation.ts:145`).
- `instanceMatrix.setUsage(35048)` — raw enum for `DynamicDrawUsage` (`src/systems/Vegetation.ts:40`), even though matrices are static after init.

## Public API

- `readonly root: Group` — added directly to the scene by Game (`src/game/Game.ts:167-168`).
- `update(time: number): void` — advance the wind clock (`src/systems/Vegetation.ts:78`).
- `dispose(): void` — disposes blade geometry + material (`src/systems/Vegetation.ts:82-85`).

## Interactions

- **World** provides the surface function: imports `terrainSurfaceY` from `../game/World` (`src/systems/Vegetation.ts:12`), which reproduces World's terrain displacement formula minus the −0.2 plane offset (`src/game/World.ts:248-262`). The ring constants are chosen against World's geometry: ground plane spans `CITY_SIZE+40` (`src/game/World.ts:193`) and terrain eases to hills beyond radius 250 (`src/game/World.ts:220-228`).
- **Game**: constructed and added to scene in constructor (`src/game/Game.ts:167-168`); updated per frame before render (`src/game/Game.ts:447`); disposed on teardown (`src/game/Game.ts:361`). Note it lives on `scene`, not `world.root`.
- Wind gust frequency is hardwired in the vertex shader as two summed sines `sin(t*1.8+phase)*0.6 + sin(t*3.1+phase*1.7)*0.4`, bend amount `uWind*gust*(p.y*p.y)` so roots stay planted while tips sway; bend applies mostly on X with 40% bleed to Z (`src/systems/Vegetation.ts:159-163`).

## Tuning & Extension Points

- Density/extent: `BLADE_COUNT = 24000`, `RING_MIN = 280`, `RING_MAX = 760` (`src/systems/Vegetation.ts:14-16`) — the three knobs for perf vs meadow size.
- Palette: `ROOT_COLOR 0x5f9a45`, `TIP_COLOR 0xa8d54a` (`src/systems/Vegetation.ts:18-19`).
- Wind strength `uWind: 0.35` and shading constant `vShade = 0.55 + 0.45*max(dot(n,sunDir),0)` (`src/systems/Vegetation.ts:142,167`).
- Blade shape: `segments=4`, `height=1.0`, `width=0.06`, taper exponent `1.4`, lean factor `0.12` (`src/systems/Vegetation.ts:96-111`); scale jitter ranges at `src/systems/Vegetation.ts:61-62`.
- Extension point: the lambert sun direction is duplicated — once as the `uSun` uniform (`src/systems/Vegetation.ts:143`) and again hardcoded inline in the vertex shader (`src/systems/Vegetation.ts:167`); hooking DayNightSystem's sun direction means updating both. The unused `uSun` uniform suggests this was the intended seam.

## Unresolved

- Grass ignores weather/day-night: no rain flattening, no night darkening (shade term is static). WetSurfaceSystem covers only the city ground material (`src/game/Game.ts:171`).
- `DynamicDrawUsage` on an instance matrix buffer that is written exactly once is unnecessary; harmless but misleading.
- Blades can visually intersect the terrain on steep slopes since placement samples the analytic surface but blades stay upright (no slope-aligned tilt or normal blending).
