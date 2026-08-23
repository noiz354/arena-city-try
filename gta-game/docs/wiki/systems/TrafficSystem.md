# TrafficSystem

## Purpose

Spawns and drives the living AI traffic: a fixed pool of cars that follow the road grid, choose turns at intersections, brake for obstacles ahead, get culled far from the player, and can be hijacked (player presses E → AI permanently releases the car). It also answers "nearest enterable traffic car" queries and exposes its cars as solid collidables so vehicles/players can't overlap.

## Execution Flow

**Module-level setup** — `roadLines()` builds one center-line coordinate per axis for every gap between blocks: `i * CELL - CITY_HALF + BLOCK_SIZE + ROAD_WIDTH / 2` for `i` in `[0, BLOCK_COUNT-2]` (`src/systems/TrafficSystem.ts:8-14`). With `CELL=40`, `BLOCK_SIZE=30`, `ROAD_WIDTH=10`, `CITY_HALF=155` (`src/systems/CityGenerator.ts:4-9`) this yields exactly `[-120, -80, -40, 0, 40, 80, 120]` (comment at `:16`). `ROADS` is computed once at module load; `CITY_LIMIT = CITY_HALF - 6 = 149` (`:17`).

**Construction** — 10 cars (`TRAFFIC_COUNT`, `:18`), each from an independent roll of a seeded mulberry32 PRNG (seed `0x7a11ca9`, `:57`): random lane line, axis (`x` if `rng > 0.5`), direction (`±1`), start position `along = ±(CITY_HALF - 30) = ±125` along the travel axis (`:64`), and a random `VEHICLE_CONFIGS` entry. The car is placed via `new Vehicle(config, axis==='x' ? along : lane, axis==='z' ? along : lane, yawFor(axis, dir))`, starts **invisible** (`vehicle.group.visible = false`, `:73`) until culling brings it in, and gets cruise speed `speed = 8 + rng() * 5` → **8–13 m/s** (`:78`). Game scene-adds each group (`src/game/Game.ts:202`).

**Per frame** — `Game.update` calls `traffic.update(delta, pos.x, pos.z, allCollidables)` where `allCollidables = world.getCollidables().concat(vehicles.getCollidables())` i.e. buildings + parked cars (`src/game/Game.ts:397-398,408`). For each `TrafficCar`:

1. Visibility culling vs player position: `visible = dx² + dz² < 100²` (`:121-123`).
2. If `v.occupied || v.stolen` → skip entirely; hijacked cars are player-owned now (`:125`).
3. Otherwise `drive(dt, car, collidables)` (`:127`, impl `:131-187`):
   - **Obstacle set**: passed-in statics/parked cars *plus* own-traffic collidables excluding self: `collidables.concat(this.getCollidables(v))` (`:140`) — used for both braking and physical push-out.
   - **Blocked probe**: single point `7 m` ahead along forward `(sin yaw, cos yaw) * SAFE_GAP`; blocked if that point falls inside any obstacle box inflated by `0.5 m` on x/z (`:143-154`). `targetSpeed = blocked ? 0 : car.speed` (`:156`) — binary stop/go, no gradual slowdown.
   - **Intersection logic**: finds the next road line beyond `coord ± 1` in travel direction (`:159-162`). If within `INTERSECTION_REACH = 6 m`: rolls `this.rng()` once and computes `right = roll < 0.25`, `straight = roll < 0.75` (`:167-169`). A route change happens only when `!straight` (roll ≥ 0.75); then `turn(axis, dir, right)` is taken and its new `lane` is snapped to `nextLine` (`:170-175`). ⚠️ Because `right === true` requires `roll < 0.25`, which implies `straight === true`, **every executed turn has `right = false` → all turns are left turns in practice; ~75% straight / ~25% left** (see Unresolved).
   - `v.aiDrive(dt, targetYaw, targetSpeed, obstacles)` does steering (clamped turn rate ×0.7), accel/decel toward target speed (×0.8 factors), integration, collision push-out, world bounds, impact damage (`src/entities/Vehicle.ts:133-153`).
   - **City bounds**: position clamped to ±149; when either axis hits the limit the route direction flips on the same lane (`:181-186`).

## Data Structures

| Structure | Shape | Meaning |
|---|---|---|
| `Axis` | `'x' \| 'z'` | Travel axis (`:23`) |
| `Route` | `{ axis: Axis; dir: 1 \| -1; lane: number }` | Current road: axis, sign of travel, fixed perpendicular coordinate (a value from `ROADS`) (`:25-30`) |
| `TrafficCar` | `{ vehicle: Vehicle; route: Route; speed: number }` | One AI car + plan + desired cruise speed (`:44-48`) |
| `cars` | `readonly TrafficCar[]` | Fixed pool, length 10 forever (`:56`) |
| Vehicle flags | `occupied`, `stolen`, `wrecked` | Set by ModeController / damage; drive loop reads them (`:125`; `src/entities/Vehicle.ts:37-40`) |

Heading convention: `yawFor(axis, dir)` maps `(x,+1)→π/2`, `(x,-1)→-π/2`, `(z,+1)→0`, `(z,-1)→π`, matching Vehicle's `forward = (sin yaw, cos yaw)` (`:32-36`; `src/entities/Vehicle.ts:66-68`). Turn mapping: right turn `(x,d)→(z,d)` / `(z,d)→(x,-d)`; left is the mirrored negation (`:39-42`).

## Public API

| Method | Signature | Behavior |
|---|---|---|
| `getNearest` | `(x: number, z: number): Vehicle \| null` | Nearest hijackable car within `ENTER_DIST² = 12.96` (3.6 m radius). Skips `occupied`, invisible, and `wrecked` cars (`:84-99`). Used by ModeController only after `VehicleManager.getNearest` misses (`src/systems/ModeController.ts:122-123,131-132`), so parked cars win ties by priority. |
| `getCollidables` | `(exclude?: Vehicle): Collidable[]` | Visible non-excluded cars as `{ box }` from `Vehicle.getCollidableBox()`. Wrecked cars **stay solid** (`:106-114`, doc comment `:101-105`). Invisible ⇒ no collider. |
| `update` | `(dt: number, playerX: number, playerZ: number, collidables: Collidable[]): void` | Culling + AI drive per section above (`:117-129`). `collidables` must be buildings+parked; traffic-vs-traffic is added internally. |
| `dispose` | `(): void` | Per-car mesh/material dispose + group removal, empties `cars` (`:189-204`). Called from `Game.destroy` (`src/game/Game.ts:365`). |

Field access: `cars` is public readonly — Game iterates it for scene add (`:202`), the mission chase-target supplier (`:210`), and player-run-over checks (`:549`).

## Interactions

- **Game.ts**: construction/scene wiring (`:201-202`); per-frame update with combined collidables (`:408`); `checkTrafficPlayerCollision` iterates `traffic.cars` — on-foot players hit by a visible car with `|speed| ≥ 2.5` take `min(40, round((speed-2.5)*6))` damage plus knockback `(sin yaw·speed·0.6, 3.5, cos yaw·speed·0.6)`, gated by a 400 ms cooldown (`:543-569`).
- **ModeController**: fallback `getNearest` for E-enter (`src/systems/ModeController.ts:123,:132`); `traffic.getCollidables(v?)` appended to the driving collision set (`:148`) and foot player set (`:86`).
- **MissionSystem (chase missions)**: receives `() => traffic.cars.map(c => c.vehicle)` from Game (`src/game/Game.ts:210`); picks a chase target among `!v.occupied && !v.wrecked` and boosts its speed to `max(speed, 14)` m/s for the pursuit (`src/systems/MissionSystem.ts:100-107`).
- **Vehicle entity**: motion delegated to `aiDrive` (`:178`); `wrecked` forces `targetSpeed = 0` inside aiDrive (`src/entities/Vehicle.ts:134`); impact damage applies to AI cars too (`:179-185`).
- **State exchanged**: `enterVehicle` sets `occupied = stolen = true` (`src/systems/ModeController.ts:177-178`) — `stolen` is one-way; TrafficSystem never resumes a stolen car (`:125` comment "hijacked — player controls now"). Exiting leaves `stolen = true`, so the abandoned car sits forever (`src/systems/ModeController.ts:194` sets only `occupied = false`).

## Tuning & Extension Points

| Constant | Value | Where | Effect |
|---|---|---|---|
| `TRAFFIC_COUNT` | `10` | `:18` | Pool size; cars are never recycled or respawned elsewhere. |
| Cruise speed | `8 + rng*5` m/s (~29–47 km/h) | `:78` | Per-car target speed; chase missions override upward. |
| `INTERSECTION_REACH` | `6` m | `:19` | Distance before a crossing at which the turn decision locks in. |
| `SAFE_GAP` | `7` m (+0.5 box inflation) | `:20`, `:148-149` | Ahead-probe distance for stopping; raise for faster traffic. |
| `CITY_LIMIT` | `CITY_HALF - 6 = 149` | `:17` | Hard clamp + U-turn trigger. |
| Cull radius | `100` m | `:123` | Inline literal, not a named constant. |
| Turn RNG | `roll < 0.25 → right`, `roll < 0.75 → straight`, else left | `:167-170` | Effective distribution 75% straight / 25% left. |
| Seed | `0x7a11ca9` | `:57` | Deterministic spawn pattern. |

Safe extensions: push more entries into `cars` (all consumers iterate it); adjust `drive()` for lane offsets (currently all cars use exact center lines, so opposing traffic shares one line and relies on the SAFE_GAP probe + push-out to avoid head-ons).

## Unresolved

- The turn distribution looks unintentional: `right = roll < 0.25` is unreachable together with `!straight` (roll ≥ 0.75), so the documented right-turn mapping (`:38-42`) is dead code at runtime. Source alone can't confirm whether 75/25 straight/left was intended or should be e.g. 50% straight / 25% right / 25% left.
- The blocked probe is a single point 7 m ahead; long vehicles (Truck length 6.4 m, `src/data/vehicles.ts:83`) can overlap an obstacle nose before the probe point enters the inflated box. No source evidence of a fix.
