# PedestrianSystem

## Purpose

Populates the city with 22 low-poly civilians that walk sidewalks, idle, flee from gunfire and vehicle impacts, can be shot or run over (feeding the wanted system), and occasionally emit ambient dialogue lines when the player is close. It owns both the `Pedestrian` entity (state machine + procedural body + movement/collision) and the `PedestrianSystem` pool (spawning, panic broadcast, dialogue aggregation).

## Execution Flow

**Construction** — `new PedestrianSystem()` spawns `PEDESTRIAN_COUNT = 22` pedestrians at deterministic sidewalk spots drawn from a mulberry32 PRNG seeded `0xabc12345` (`src/systems/PedestrianSystem.ts:234-236`, ctor `:238-245`). Each `Pedestrian` starts at `(x, 0, z)` with initial state `walk` if `rng() > 0.4` (≈60% walkers), `timer = 2 + rng()*5` s, random heading (`:56-63`). Game adds the shared `group` to the scene once (`src/game/Game.ts:198-199`). Bodies are pure primitives built in `buildBody`: torso box 0.5×0.7×0.3 at y=1.05, head cube 0.3³ at y=1.62, hair slab at y=1.76, two legs 0.16×0.72×0.18 at x=±0.13 y=0.36; shirt color from one of 6 palette hexes, pants/skin lightness jittered via `offsetHSL(0,0,(rng()-0.5)*0.15 / *0.12)` (`:198-226`).

**Per frame** — `Game.update` calls `this.pedestrians.update(delta, buildings)` with building collidables only (`src/game/Game.ts:407`; note the optional third arg `shotOrigin` is never passed here). For each pedestrian:

1. If `shotOrigin` was provided and ped is alive → `panic(shotOrigin)` (broadcast form; unused by Game) (`:251-256`).
2. `p.update(dt, collidables, this.pedestrians)` runs the state machine (`:112-169`):
   - **Dead**: body rotates toward face-down `-π/2` (damp rate 4), sinks at `0.4 m/s`, hides below `y < -2`; no further logic (`:113-117`).
   - Timers tick down; **flee** expires into `idle` for `3 + rng*4` s (`:123-125`); **walk** expires into idle for `2 + rng*5` s (`:131-133`); **idle** expires into walk for `4 + rng*8` s with a fresh random angle (`:134-137`).
   - Speeds: `WALK_SPEED = 1.4` m/s while walking, `FLEE_SPEED = 4.2` m/s while fleeing; walking adds per-frame heading jitter `(rng()-0.5)*0.3*dt` rad (`:128-149`).
   - Fleeing steers to `atan2(away.x, away.z)` directly away from `panicSource` (`:139-148`).
   - Movement integrates `sin/cos(angle) * speed * dt`; facing damps toward angle at rate 8 (`:151-155`).
   - `resolveCollisions`: circle-vs-AABB push-out with `RADIUS = 0.4` against boxes whose y-range intersects `[0,2]` (`:173-183`), plus soft ped-vs-ped separation when closer than `2R` (push factor 0.4 of overlap, dead peds skipped) (`:184-195`).
   - **Homing**: if more than 40 m from spawn, drifts back toward the spawn point at `WALK_SPEED` so peds don't wander off permanently (`:159-165`).
   - Clamped inside `±(CITY_HALF - 1)` = ±154 m; `y` forced to 0 (`:166-168`).

**Dialogue polling** — while on foot and alive, Game polls `maybeSpeak(player.position)` every frame and forwards non-null lines to `game.onDialogue` (`src/game/Game.ts:419-421`). The chain: `PedestrianSystem.maybeSpeak` returns the first line produced by any ped's `Pedestrian.maybeSpeak` (`:269-275`), which decrements a private `speechCooldown` by a fixed `0.016` per call (assumes ~60 fps), requires distance ≤ `DIALOGUE_DIST² = 5.5²`, passes a `rng() > 0.002` gate (≈0.2% chance per frame while close), then sets a 6 s cooldown and picks one of 10 `LINES` strings (`:101-110`, table `:20-31`).

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `State.kind` | `'walk' \| 'idle' \| 'flee'` | Current behavior (`:35-40`) |
| `State.timer` | `number` | Seconds until this state may expire |
| `State.angle` | `number` | Heading in radians (movement + facing target) |
| `State.panicSource?` | `Vector3` | Flee-away point (gunshot origin / damage location) |
| `Pedestrian.health` | `number` | Starts 100 (`:44`) |
| `Pedestrian.dead` | `boolean` | Death latch; gates all updates (`:45`) |
| `Pedestrian.hitRadius / hitHeight` | `0.38 / 1.8` | Ray-capsule target shape for bullets (`:46-47`) |
| `Pedestrian.carHitAt` | `number` | `performance.now()` of last car hit; anti-multi-frame cooldown read by Game (`:49`, used `src/game/Game.ts:500,513`) |
| `Pedestrian.speechCooldown` | `private number` | Dialogue throttle seconds (`:54`) |
| `pedestrians` | `readonly Pedestrian[]` | Fixed pool of 22, dead ones stay in it (`:234`) |

## Public API

### PedestrianSystem

| Method | Signature | Behavior |
|---|---|---|
| `alive` (getter) | `(): Pedestrian[]` | Filters `!dead` — allocates a fresh array on every access (`:247-249`). Supplied to WeaponSystem as shootable extra targets via `() => this.pedestrians.alive` (`src/game/Game.ts:274`). |
| `update` | `(dt: number, collidables: Collidable[], shotOrigin?: Vector3): void` | Optional global panic broadcast + per-ped update (`:251-256`). |
| `panicNear` | `(from: Vector3, radius: number): void` | Panics every living ped within `radius²` of `from` (`:259-266`). Called with radius **40** on every weapon shot from the player position (`src/game/Game.ts:253`). |
| `maybeSpeak` | `(playerPos: Vector3): string \| null` | First dialogue line from any ped this frame (`:269-275`). |
| `pickSidewalkSpot` (private) | `(): [number, number]` | Random block (`gi`,`gj` ∈ [0,8)), random one of 4 edges, `inset = 2` m from the block edge, random position along that edge within `[blockMin+inset, blockMin+BLOCK_SIZE-inset]` (`:278-290`). |

### Pedestrian

| Method | Signature | Behavior |
|---|---|---|
| `takeDamage` | `(amount: number): boolean` | Returns `true` iff this hit killed. Survivors switch to flee with a blank panic source (`:69-79`). |
| `runOver` | `(carSpeed: number): boolean` | Damage = `carSpeed * 9` (so ≥ ~11.2 m/s kills a 100 HP ped in one hit); survivors get a longer flee (`FLEE_DURATION + 1.5` s) and a dazed `rotation.x = -0.5` tilt (`:82-92`). |
| `panic` | `(from: Vector3): void` | No-op if dead or already fleeing; otherwise flee toward away-from-clone of `from` (`:95-98`). |
| `maybeSpeak` | `(playerPos: Vector3): string \| null` | Per-ped dialogue roll described above (`:101-110`). |
| `update` | `(dt, collidables, pedestrians)` | State machine + collision + homing (`:112-169`). |
| `position` (getter) | `Vector3` | Alias of `group.position` (`:65-67`). |

## Interactions

- **Game.ts**: constructs/scene-adds (`:198-199`); per-frame update with building collidables (`:407`); `checkCarPedestrianCollisions` pairs every living ped (400 ms `carHitAt` cooldown, `:499-500`) against every visible vehicle moving ≥ 2.5 m/s within hit radius `max(width,length)*0.6 + 0.35` (`:506-510`): calls `runOver(speed)`, halves-ish car speed `×0.72` (`:512`), shakes 0.5/0.2, reports wanted severity 2 if killed else 1, plays damage audio on kill (`:511-520`).
- **WeaponSystem**: `alive` supplier registers peds as soft ray targets; nearest ped hit beats enemies, calls `takeDamage(damage)`, kill classified as `'civilian'` → `hooks.onKill('civilian')` (`src/systems/WeaponSystem.ts:240-263`); Game maps that to `wanted.reportCrime(2, playerPos)` (`src/game/Game.ts:269`).
- **Gunfire → panic**: `onShoot` hook triggers `pedestrians.panicNear(p, 40)` before crime checks (`src/game/Game.ts:249-253`).
- **WantedSystem**: indirect consumer via the two `reportCrime` paths above (severity scale documented at `src/systems/WantedSystem.ts:29`).
- **HUD/dialogue**: lines surface through `Game.onDialogue` hook set from main (`src/game/Game.ts:95`, invoked `:421`).
- **World/CityGenerator**: collidables come from `world.getCollidables()` → active chunks (`src/game/World.ts:125-126`); spawn/clamp math uses `BLOCK_SIZE/CELL/CITY_HALF/BLOCK_COUNT` constants (`src/systems/CityGenerator.ts:4-9`).

## Tuning & Extension Points

| Constant | Value | Where | Effect |
|---|---|---|---|
| `PEDESTRIAN_COUNT` | `22` | `:13` | Pool size; fixed at construction. |
| `WALK_SPEED` | `1.4` m/s | `:14` | Walk + homing speed. |
| `FLEE_SPEED` | `4.2` m/s | `:15` | Panic sprint (3× walk). |
| `FLEE_DURATION` | `3.5` s (+1.5 for run-over daze) | `:16`, `:88` | Panic length. |
| `RADIUS` | `0.4` m | `:17` | Collision circle; ped-ped separation uses `2R`. |
| `DIALOGUE_DIST` | `5.5` m | `:18` | Max player distance for speech rolls. |
| Speak chance | `rng() > 0.002` gate, 6 s cooldown, fixed `0.016` decay | `:102,:107-108` | ≈0.2%/frame at 60 fps while near. |
| Run-over lethality | `dmg = speed * 9` vs 100 HP | `:84` | One-hit kill above ~11.1 m/s. |
| Homing threshold | `40` m | `:162` | Beyond this, peds beeline home. |
| Shirt palette | 6 hexes `0x5d8aa8…` | `:33` | Body color variety. |
| Seed | `0xabc12345` | `:236` | Deterministic placement. |

Safe extensions: append new `LINES`; add states by extending `State.kind` + the `update` branch chain; more peds just means raising the constant (per-frame cost is O(n·collidables)). Dead peds are never recycled — a respawn pass would reset `health/dead/state/rotation/visibility` and reposition.

## Unresolved

- `speechCooldown` decays by a hardcoded `0.016` per call rather than real dt (`:102`), so dialogue cadence scales inversely with frame rate (higher fps ⇒ faster cooldown recovery). Likely an intentional simplification; worth knowing if frame rates vary widely.
