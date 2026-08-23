# MinimapSystem

Source: `src/systems/MinimapSystem.ts`

## Purpose

2D canvas minimap in the bottom-right: north-up road grid, city bounds, mission start zones, active mission waypoint, and a yaw-rotated player arrow. Deliberately sandbox-safe — pure Canvas 2D, no textures or CDN (src/systems/MinimapSystem.ts:7-10).

## Execution Flow

**Init** — constructor creates a 168×168 canvas, assigns CSS class `'minimap'`, appends it to `#ui-root`, and grabs the 2D context (src/systems/MinimapSystem.ts:15-22). No state is stored between frames beyond the context; every frame redraws from scratch.

**Per-frame** — `update(playerPos, playerYaw, waypoint, zones)` (src/systems/MinimapSystem.ts:24-104), called every tick via `Game.updateMinimap` with `modeCtrl.activePosition` / `activeYaw` (car position and heading while driving — src/game/Game.ts:527-534; src/systems/ModeController.ts:63-70), `missions.waypoint()` (src/systems/MissionSystem.ts:133-153) and `missions.markerPositions()` (src/systems/MissionSystem.ts:208-214). Draw order:

1. Background disc `rgba(10, 14, 18, 0.82)` of radius `half - 2` (82 px) (src/systems/MinimapSystem.ts:30-34).
2. Circular clip of radius `half - 4` — everything after this is circle-masked (src/systems/MinimapSystem.ts:37-40).
3. World→map projection closures: `px = half + (wx - playerPos.x) * scale`, same for z (src/systems/MinimapSystem.ts:42-43). The map is **world-fixed / north-up**: the world translates under a fixed center; only the player arrow rotates.
4. Roads: vertical strokes at each `ROADS_X` x-coordinate, horizontal at each `ROADS_Z` z, stroke `rgba(120,130,145,0.5)`, width 2 px (src/systems/MinimapSystem.ts:46-59).
5. City bounds rectangle spanning ±`CITY_HALF`, stroke white @ 0.15 alpha (src/systems/MinimapSystem.ts:62-63).
6. Mission zones: filled green `#2ecc71` dots radius 4 px per zone entry (src/systems/MinimapSystem.ts:66-71).
7. Waypoint (if non-null): gold `#ffd166` dot radius 5 px plus a pulsing-style ring stroke radius 9 px, `rgba(255,209,102,0.5)`, width 1.5 px (src/systems/MinimapSystem.ts:74-84).
8. Player arrow: translate to center, rotate by raw `playerYaw`, fill cyan `#7ef0ff` triangle `(0,-7) → (5,6) → (-5,6)` — nose pointing up-map before rotation, i.e. −z is "forward" on the map matching three.js forward (src/systems/MinimapSystem.ts:87-96).
9. `ctx.restore()` pops the clip; border ring `rgba(255,255,255,0.35)` width 2 px drawn last outside the clip (src/systems/MinimapSystem.ts:96-103).

Blip logic summary: zones render only while no mission is active (because `markerPositions()` returns available-mission start points then, src/systems/MissionSystem.ts:208-214); during an active mission the waypoint dot follows its current objective (delivery pickup/dropoff, race checkpoint, assassination target position clone, or chase-target car — src/systems/MissionSystem.ts:133-153). Off-map blips are simply hidden by the circular clip; there are no edge-clamped indicators.

## Data Structures

- `canvas: HTMLCanvasElement` + `ctx: CanvasRenderingContext2D` — the only fields (src/systems/MinimapSystem.ts:12-13).
- Constants: `SIZE = 168` px, `VIEW = 420` m shown across the map (src/systems/MinimapSystem.ts:4-5); derived scale = `SIZE / VIEW` ≈ 0.4 px/m (src/systems/MinimapSystem.ts:27).
- Inputs consumed read-only: `Vector3` player pos, numeric yaw, nullable waypoint `Vector3`, zone array `{ pos: Vector3; color: number }[]` (src/systems/MinimapSystem.ts:24).
- World constants imported: `CITY_HALF = 155`, `ROADS_X`, `ROADS_Z` (src/systems/MinimapSystem.ts:2; values src/systems/CityGenerator.ts:8-9, 28-31). Roads sit at 40 m spacing (`CELL`) offset to block edges → centerlines at −120, −80, −40, 0, 40, 80, 120 on both axes.

## Public API

- `constructor()` — no args; self-appends to `#ui-root` via non-null assertion (throws if that element is missing) (src/systems/MinimapSystem.ts:20).
- `update(playerPos: Vector3, playerYaw: number, waypoint: Vector3 | null, zones: Array<{ pos: Vector3; color: number }>): void` — full redraw; call once per frame (src/systems/MinimapSystem.ts:24).

## Interactions

- Owned by Game as `game.minimap`; constructed after MissionSystem so it has nothing to query itself — all data arrives as arguments (src/game/Game.ts:225, 68).
- Game feeds it `modeCtrl.activePosition`/`activeYaw`, so the map tracks the car rather than the (hidden) player while driving (src/game/Game.ts:528-533).
- MissionSystem is the sole source of both blip types: start zones when idle, live waypoint during missions (src/game/Game.ts:531-532).
- No enemy, pedestrian, vehicle, or police blips exist anywhere in the file or its callers.
- Styling comes from the bundled `.minimap` CSS class (positioning/border-radius handled in stylesheet; not in this file).

## Tuning & Extension Points

Actual values:

- Map size 168×168 px; viewport 420 m; scale ≈ 0.4 px/m (src/systems/MinimapSystem.ts:4-5, 27). Since `VIEW` (420) > `CITY_SIZE` (310, src/systems/CityGenerator.ts:8), the whole city fits within the window when centered.
- Clip radius `half - 4`, background/border radius `half - 2` (src/systems/MinimapSystem.ts:33, 39, 102).
- Arrow triangle 12 px tall × 10 px wide (src/systems/MinimapSystem.ts:91-94); waypoint dot r=5, halo r=9 (src/systems/MinimapSystem.ts:77-83); zone dot r=4 (src/systems/MinimapSystem.ts:69).
- Palette: background rgba(10,14,18,0.82); roads rgba(120,130,145,0.5); bounds rgba(255,255,255,0.15); border rgba(255,255,255,0.35); zones #2ecc71; waypoint #ffd166; arrow #7ef0ff (lines cited above).
- Extension points: new blip types = one more draw loop inside the clip region using the existing `px`/`py` helpers (src/systems/MinimapSystem.ts:42-43); a rotating-map variant would move the `ctx.rotate(playerYaw)` from the arrow block to wrap steps 3–8 (src/systems/MinimapSystem.ts:87).

## Unresolved

- The `zones[].color` parameter is ignored — zone dots are hard-coded green regardless of the passed color (src/systems/MinimapSystem.ts:66-71 vs MissionSystem supplying 0x2ecc71, src/systems/MissionSystem.ts:212).
- Waypoints outside the 420 m window vanish entirely (clipped) with no edge-of-map direction indicator (src/systems/MinimapSystem.ts:37-40, 74-84).
- Full canvas redraw every frame even when nothing moved; fine at 168² but there is no dirty-flagging.
- No devicePixelRatio scaling — the backing store is fixed 168 px, so the minimap will look soft on HiDPI displays (src/systems/MinimapSystem.ts:16-19).
- Yaw handedness: the arrow uses raw `playerYaw` directly (src/systems/MinimapSystem.ts:88); correctness relies on Player/Vehicle yaw convention (rotation.y with −z forward) and was verified only against HUD compass math which negates for screen-space rotation (src/ui/hud.ts:168-173).
