# VehicleManager

## Purpose

Owns the city's *parked* (statically placed, enterable) vehicles: deterministic spawn spots along road strips, per-frame distance-based visibility culling, the nearest-enterable-vehicle query used by the E key, and the axis-aligned collidables that make parked cars solid for player physics, traffic AI, camera wall-avoidance, and weapon raycasts. It deliberately does **not** drive anything — motion is `Vehicle.update` (player) or `TrafficSystem`/`Vehicle.aiDrive` (AI); this class is pure placement + queries.

## Execution Flow

**Construction** — `new VehicleManager()` takes no arguments; all randomness comes from an internal mulberry32 PRNG seeded with `0x5eed1234`, so layout is identical every run (`src/systems/VehicleManager.ts:18`). The constructor runs two spawn passes in order:

1. `spawnParkedCars()` (`src/systems/VehicleManager.ts:21`, impl `:81-109`) — iterates the block grid (`gi`,`gj` over `BLOCK_COUNT = 8`, see `src/systems/CityGenerator.ts:7`) until `PARKED_COUNT = 20` cars are spawned:
   - Skips the single corner block pair `gi === BLOCK_COUNT-1 && gj === BLOCK_COUNT-1` (`:85`).
   - For each block picks a random config once: `VEHICLE_CONFIGS[Math.floor(rng() * VEHICLE_CONFIGS.length)]` (`:89`) — note one config is shared by both potential spots of a block.
   - **East road spot** (vertical road at block's east edge): only if `gi < BLOCK_COUNT-1` and `rng() < 0.3`; position `x = blockMinX + BLOCK_SIZE + 2.3`, `z = blockMinZ + 3 + rng() * (BLOCK_SIZE - 6)`, yaw `0` (`:92-98`).
   - **South road spot** (horizontal road at block's south edge): only if `gj < BLOCK_COUNT-1`, still under the cap, and `rng() < 0.3`; `z = blockMinZ + BLOCK_SIZE + 2.3`, `x = blockMinX + 3 + rng() * (BLOCK_SIZE - 6)`, yaw `Math.PI / 2` (`:101-106`). The `2.3 m` offset puts the car on the road strip, just off the sidewalk edge.
   - Grid geometry comes from `CELL = 40`, `BLOCK_SIZE = 30`, `CITY_HALF = 155` (`src/systems/CityGenerator.ts:4-9`).
2. `spawnCenterCars()` (`src/systems/VehicleManager.ts:22`, impl `:30-42`) — four hardcoded cars around the origin so the spawn intersection feels populated: `(0, 7)` sedan yaw 0; `(0, -8)` taxi yaw π; `(8, 0)` sedan yaw π/2; `(-9, 0)` `VEHICLE_CONFIGS[2]` (Muscle) yaw -π/2 (`:33-38`). These ride the x=0 / z=0 center roads (roads span ±5 m).

Game then adds every group to the scene: `for (const v of this.vehicles.vehicles) this.scene.add(v.group)` (`src/game/Game.ts:190-191`).

**Per frame** — `update(playerX, playerZ)` is called once from `Game.update` with the *active* (player-or-car) position, before `ModeController.update` (`src/game/Game.ts:389,395`). For each vehicle it recomputes `v.group.visible` from squared XZ distance vs `VISIBLE_DIST² = 95²` — this is both culling *and* un-culling (assignment, not one-way hide), so cars reappear when approached; fog hides the pop-in (`src/systems/VehicleManager.ts:44-50`).

There is no other per-frame work: parked cars have no physics tick of their own.

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `vehicles` | `readonly Vehicle[]` | All parked cars ever spawned (never shrinks except in `dispose`) (`src/systems/VehicleManager.ts:17`) |
| `rng` | `() => number` | Seeded mulberry32, seed `0x5eed1234` (`:18`) |

Per-vehicle state actually lives on `Vehicle` (`src/entities/Vehicle.ts:33-40`): `speed` (signed scalar, m/s), `yaw`, `health`, `wrecked`, `occupied`, `stolen`. Config data is `VehicleData` from `src/data/vehicles.ts:5-24` (acceleration, maxSpeed, reverseMax, brakeForce, friction, turnRate, rollFactor, width/height/length/wheelRadius, maxHealth). Spawned configs come from `VEHICLE_CONFIGS = [SEDAN, TAXI, MUSCLE, TRUCK]` (`src/data/vehicles.ts:88-93`): Sedan 24 m/s top speed / turnRate 1.7 / 100 HP; Taxi = Sedan spread but `maxSpeed 22`; Muscle 30 m/s / accel 16 / turnRate 1.5; Truck 17 m/s / accel 7 / turnRate 1.0 / 150 HP.

## Public API

| Method | Signature | Behavior |
|---|---|---|
| `update` | `(playerX: number, playerZ: number): void` | Visibility toggle for all vehicles within 95 m of the given point (`:44-50`). Called with `modeCtrl.activePosition` (`src/game/Game.ts:395`). |
| `getNearest` | `(x: number, z: number): Vehicle \| null` | Nearest enterable car. Initializes `bestD = ENTER_DIST² = 12.96` and returns `null` unless a candidate's **squared XZ distance < 12.96** (i.e. strictly inside a **3.6 m radius**) (`:52-66`). Skips two categories: currently culled cars (`!v.group.visible`, `:56`) and wrecked ones (`v.wrecked`, `:56`). Ties broken by first-found. **This explains the runtime observation "null despite cars 7–10 units away": 7–10 m exceeds the hard 3.6 m enter threshold — the query never expands its radius; there is no second-chance or nearest-regardless-of-distance mode.** A car exactly at 3.6 m also fails (`d < bestD` is strict). |
| `getCollidables` | `(exclude?: Vehicle): Collidable[]` | Builds `{ box }[]` from `Vehicle.getCollidableBox()` for visible vehicles only, skipping `exclude` (`:69-75`). Invisible ⇒ no collider, so nothing off-screen blocks movement. Boxes are cached rotated-extent AABBs recomputed only after motion (`src/entities/Vehicle.ts:78-92`), y-range `[0, config.height]`. |
| `dispose` | `(): void` | Traverses each group, disposes geometries + materials (array-aware), removes groups from parent, empties the array (`:111-126`). Invoked from `Game.destroy` (`src/game/Game.ts:364`). |

## Interactions

- **Game.ts (orchestrator)**: constructs and scene-adds it (`:190-191`); calls `vehicles.update(activePos)` each frame (`:395`); feeds `vehicles.getCollidables()` into weapon raycasts (`:243`), traffic obstacle sets (`:398` → passed to `traffic.update` at `:408`) and the F3 collider visualizer (`:402`); iterates `vehicles.vehicles` to detect new wrecks (explosion + smoke + shake 0.9, `:470-481`) and for car-vs-pedestrian run-over checks (`:497-525`); disposes on destroy (`:364`).
- **ModeController**: `getNearest(player.x, player.z)` as the primary enter target with `traffic.getNearest` as fallback (`src/systems/ModeController.ts:121-133`); `getCollidables()` (foot camera/player solids, `:85`) and `getCollidables(v)` while driving, excluding the driven car itself (`:147`).
- **Vehicle entity**: manager creates `new Vehicle(config, x, z, yaw)` (`:40,:95,:104`); health initialized to `config.maxHealth` in the Vehicle ctor (`src/entities/Vehicle.ts:52`).
- **CityGenerator**: supplies grid constants and `seededRng` (`src/systems/VehicleManager.ts:3`).
- **State exchanged**: `Vehicle.occupied` set true/false by ModeController enter/exit (`src/systems/ModeController.ts:177,194`); `wrecked` flips inside `Vehicle.takeDamage` (`src/entities/Vehicle.ts:168-176`) and gates both entering (`:56`) and HUD prompts ("WRECKED — cannot enter", `src/ui/hud.ts:140-143`).

## Tuning & Extension Points

| Constant | Value | Where | Effect |
|---|---|---|---|
| `PARKED_COUNT` | `20` | `:7` | Cap on procedurally parked cars (center cars are extra, total ≤ 24). |
| `VISIBLE_DIST` | `95` | `:8` | Cull radius; chosen so fog covers pop-in (fog near = 90, `src/game/World.ts:40`). |
| `ENTER_DIST` | `3.6` | `:9` | Max E-key enter range (squared threshold `12.96`). Raise here *and* mirror the duplicate `ENTER_DIST = 3.6` in TrafficSystem if you want hijack range to match. |
| Parking probability | `0.3` per side | `:92,:101` | Chance a block contributes an east/south spot. |
| Road offset | `2.3` m | `:93,:102` | Distance from block edge onto the road strip. |
| Along-road jitter | `3 + rng * (BLOCK_SIZE - 6)` | `:94,:103` | Keeps spots ≥3 m from intersections. |
| PRNG seed | `0x5eed1234` | `:18` | Deterministic layout; change to reshuffle. |

Safe extensions: append to `this.vehicles` anywhere (all queries iterate the array); add new spawn strategies mirroring `spawnCenterCars`. Wrecked cars are never removed or respawned at runtime — a cleanup pass would need to filter `vehicles` and remove groups like `dispose` does per-car.

## Unresolved

- `spawnParkedCars` draws the per-block config *before* the 0.3 rolls (`:89` vs `:92/:101`), so RNG stream alignment (and therefore which configs land where) depends on both rolls even when no car spawns — deterministic but fragile if any earlier consumer of `seededRng` changes call counts.
