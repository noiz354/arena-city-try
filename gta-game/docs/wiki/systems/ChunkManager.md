# ChunkManager

## Purpose

Spatial-hash chunk streaming and LOD system for the static city. It owns one `Group` per chunk cell in a fixed 22×22 grid, decides per frame which chunks are visible around the player, builds each chunk's meshes + collision boxes lazily on first activation (via `generateChunk`), and exposes the active building collidables both as a flat list and as a per-chunk-cell spatial hash for cheap proximity queries (`src/systems/ChunkManager.ts:89-103`). Pattern note in source: "openworld-js DPZ pattern, simplified" (`src/systems/ChunkManager.ts:90`).

## Execution Flow

- **Init (constructor)**: preallocates all `CHUNK_COUNT² = 22×22 = 484` chunk records — each with its own invisible `Group` added to `root` — into a `Map` keyed `"cx_cz"` for O(1) lookup; nothing is generated yet (`src/systems/ChunkManager.ts:105-126`). `built:false`, `level:0` for all.
- **Per frame** — `update(playerX, playerZ): boolean`:
  1. Convert player world pos → chunk coords: `floor((x + CHUNK_GRID_HALF) / CHUNK_SIZE)` (`src/systems/ChunkManager.ts:138-143,147`).
  2. Iterate **all 484** chunks every call; compute Chebyshev ring distance `d = max(|Δcx|, |Δcz|)` and target LOD: `d ≤ FULL_RADIUS(1)` → level 2 (full detail), `d ≤ SIMPLE_RADIUS(2)` → level 1 (simple), else 0 hidden (`src/systems/ChunkManager.ts:150-158`; ring comment at `src/systems/ChunkManager.ts:29-34`).
  3. On any level change call `applyLevel`: level 0 just sets `group.visible=false`; levels ≥1 lazily `buildChunk` once then toggle sub-groups — full-detail `buildingsGroup` + `props` visible only at level 2, `simpleInstances` visible only at level 1 (`src/systems/ChunkManager.ts:210-222`).
  4. If anything changed, rebuild the active-collidable flat list and the spatial grid (`src/systems/ChunkManager.ts:160`, implementation `src/systems/ChunkManager.ts:369-389`). Returns the changed flag; caller `Game.update` currently ignores it (`src/game/Game.ts:390`).
- **Streaming/build behavior**: `buildChunk` runs once per chunk ever activated — generates content, creates per-building full-detail meshes with cloned window textures, prop meshes, AND the single instanced-mesh fallback, all upfront (`src/systems/ChunkManager.ts:225-254`). There is **no per-chunk teardown during play**: `disposeChunk` is only invoked from `dispose()` at game teardown (`src/systems/ChunkManager.ts:198-202`). Consequence: GPU geometry accumulates as the player explores (runtime observation ≈1798 geometries in `renderer.info.memory.geometries`), but draw calls stay bounded because far/built chunks are merely `visible=false` and mid-ring chunks render as exactly ONE InstancedMesh draw call each (`src/systems/ChunkManager.ts:287-304`) — the ~100+ far building draws collapse to ~16 for the 5×5 outer shell minus inner 3×3.
- **Active count math**: with radii 1/2, a fully interior player position yields `(2*SIMPLE_RADIUS+1)² = 25` visible chunks (`activeCount` counts `level > 0`, `src/systems/ChunkManager.ts:165-169`) — matches the observed runtime value `chunksActive=25`. Near grid edges fewer cells qualify.
- **Collidable lifecycle**: collidables exist per-chunk from build time; `rebuildActiveCollidables` concatenates them for every `level > 0` chunk and re-buckets each by the chunk cell of its box center into `grid` (`src/systems/ChunkManager.ts:369-389`).
- **Dispose**: deep-traverses each chunk disposing geometries, disposes instanced mesh geo+material, removes children, disposes stored material pairs, resets `built=false`; also disposes the module-level shared window texture (`src/systems/ChunkManager.ts:391-410`, `200-201`).

## Data Structures

- `interface Chunk { key, cx, cz, group: Group, level, built, collidables: Collidable[], buildingsGroup: Group, materials: MeshStandardMaterial[][], props: Group, simpleInstances: InstancedMesh | null }` (`src/systems/ChunkManager.ts:36-51`). `materials` stores `[fullMat, simpleMat]` pairs per building — `simpleMat` is created but never rendered, kept purely so dispose is symmetric (`src/systems/ChunkManager.ts:46-47`, `269`, `276`).
- `chunks: Map<string, Chunk>` keyed `"cx_cz"` (`src/systems/ChunkManager.ts:100`, key fn `206-208`).
- `activeCollidables: Collidable[]` — flat list handed to physics/raycast consumers (`src/systems/ChunkManager.ts:101`).
- `grid: Map<string, Collidable[]>` — static building collidables bucketed by chunk cell of their box center (`src/systems/ChunkManager.ts:102-103`).
- Module-level scratch objects `boxCenterTmp` / `instMatrix` / `instColor` keep hot paths allocation-free (`src/systems/ChunkManager.ts:53-55`).
- Shared lazy singleton `sharedWindowTexture: CanvasTexture | null` (`src/systems/ChunkManager.ts:58`); 256px canvas, 4×4 window grid, ~65% lit warm `rgba(255,214,130,.95)` vs cool `rgba(120,140,165,.9)`, RepeatWrapping, sRGB (`src/systems/ChunkManager.ts:60-87`).
- `Collidable { box: Box3 }` imported from World (`src/game/World.ts:22-24`) — buildings get an AABB from ground to roof (`y: 0..h`, `src/systems/ChunkManager.ts:278-283`). Props/trees have NO colliders.

## Public API

- `readonly root: Group` — attach point; World adds it to its own root (`src/systems/ChunkManager.ts:99`, consumed at `src/game/World.ts:57-58`).
- `update(playerX: number, playerZ: number): boolean` — recompute activation rings; true when any chunk's level changed (`src/systems/ChunkManager.ts:146`).
- `chunkWorldX(cx)/chunkWorldZ(cz): number` — world position of a chunk-grid corner, `cx*16 − 176` (`src/systems/ChunkManager.ts:129-135`).
- `worldToChunk(x, z): { cx, cz }` — world → chunk cell (`src/systems/ChunkManager.ts:138`).
- `get activeCount(): number` — count of `level > 0` chunks (debug HUD stat) (`src/systems/ChunkManager.ts:165`).
- `getActiveCollidables(): Collidable[]` — the rebuilt-on-change flat list (`src/systems/ChunkManager.ts:171`).
- `forEachNear(x, z, radius, cb: (c: Collidable) => void): void` — zero-allocation spatial query: visits cells within `ceil(radius/CHUNK_SIZE)` of the containing cell (`src/systems/ChunkManager.ts:180-189`).
- `queryCircle(x, z, radius): Collidable[]` — collecting variant, one array alloc per call (`src/systems/ChunkManager.ts:192-196`).
- `dispose(): void` — tear down everything incl. shared window texture (`src/systems/ChunkManager.ts:198`).

## Interactions

- **Upstream**: constructed and parented by `World` (`src/game/World.ts:17,57-58`); `World.update` delegates straight through (`src/game/World.ts:121-123`) and `World.getCollidables()` proxies `getActiveCollidables()` (`src/game/World.ts:125-127`).
- **Content**: imports `CHUNK_COUNT`, `CHUNK_GRID_HALF`, `CHUNK_SIZE`, `generateChunk`, spec types from CityGenerator (`src/systems/ChunkManager.ts:18-26`).
- **Game.ts consumers**: per-frame `world.update(pos.x,pos.z)` (`src/game/Game.ts:390`); weapons raycast list `world.getCollidables().concat(vehicles...)` (`src/game/Game.ts:243`); per-frame `buildings`/`allCollidables` feed pedestrians (`src/game/Game.ts:407`), traffic (`src/game/Game.ts:408`), ModeController (`src/game/Game.ts:415`); enemy LOS uses the spatial query `world.chunks.queryCircle(px,pz,70)` → `ceil(70/16)=5` → up to 121 cell lookups instead of scanning the full list (`src/game/Game.ts:405`).
- **ModeController** re-concats the same lists with traffic collidables on foot and while driving (`src/systems/ModeController.ts:85-86,147-148`).

## Tuning & Extension Points

- LOD radii: `FULL_RADIUS = 1`, `SIMPLE_RADIUS = 2` (Chebyshev, chunk units) — change these two constants to reshape the streamed bubble (`src/systems/ChunkManager.ts:33-34`).
- Grid extents derive from CityGenerator exports: `CHUNK_SIZE=16`, `CHUNK_COUNT=22`, `CHUNK_GRID_HALF=176` (`src/systems/CityGenerator.ts:10-12`).
- Window texture repeat per building: `repeat.set(max(1, round(w/4)), max(1, round(h/3)))` (`src/systems/ChunkManager.ts:259-261`); lit-window ratio `> 0.35` unlit (`src/systems/ChunkManager.ts:74`).
- Full material params: roughness 0.75 / metalness 0.05; simple: roughness 0.85 with `vertexColors:true` for instance colors (`src/systems/ChunkManager.ts:263-270,290`).
- Prop materials per chunk (6 shared MeshStandardMaterials): lamp emissive `0xffd166` @0.7, trunk `0x6b5b45`, foliage `0x3d8f52`, hydrant `0xc0392b`, bench `0x8a6b4a`, rock `0x8b8f96` (`src/systems/ChunkManager.ts:485-494`).
- Tree variation is deterministic per world position via `treeSeed(x,z)` hashing quantized 1/16m coords (`src/systems/ChunkManager.ts:423-427`) driving trunk height `2.4+s*1.2`, branch count `2+floor(s*3)`, canopy radius `1.6+s*0.9` (`src/systems/ChunkManager.ts:434-483`).
- Extension points: per-building window-texture clones are the main memory sink if exploration grows — swapping clones for UV offsets or a texture array is the natural upgrade.

## Unresolved

- `activeCount` is documented "for the debug HUD" (`src/systems/ChunkManager.ts:164`) but no HUD code references it today (`src/ui/hud.ts` has no chunk stats) — it is currently only reachable programmatically.
- The doc comment at `src/systems/ColliderDebug.ts:10` mentions `window.game.debugColliders()`; no such helper exists — see ColliderDebug page.
- Geometry accumulation over long sessions (never-disposed built chunks) is bounded by the small map (484 cells) but never measured; a `disposeChunk` call when a chunk stays at level 0 would trade CPU for memory if needed.
