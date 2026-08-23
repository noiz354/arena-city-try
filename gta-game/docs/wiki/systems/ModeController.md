# ModeController

## Purpose

The player mode state machine (the "A-1 refactor" extracted from Game.ts): owns the `foot`/`driving` switch, vehicle enter/exit placement, all on-foot input handling (weapon switching/reload, melee damage reception, mission-zone and vehicle entry via E) and driving input (throttle/steer, exit), plus the death → respawn timer. Game.ts keeps system wiring + rendering; this class owns *how the player acts* (class doc, `src/systems/ModeController.ts:43-48`).

## Execution Flow

**Construction** — built once in `Game`'s constructor with a `ModeControllerDeps` bag of 13 references: player, cameraRig, input, vehicles, traffic, world, missions, weapons, weaponView, enemies, audio, postfx, plus a lazy `telemetry?: () => GameTelemetry | undefined` getter (Game assigns its telemetry field later) and an `onPlayerDamaged?` callback (`src/systems/ModeController.ts:25-41`; wiring at `src/game/Game.ts:308-323`). Initial state: `mode = 'foot'`, `vehicle = null`, `nearestVehicle = null`, `respawnTimer = 0` (`:50-53`). Player spawns at exported constants `SPAWN_X = 0`, `SPAWN_Z = 0` (`:20-21`, used at `src/game/Game.ts:182`).

**Per frame** — `Game.update` calls `modeCtrl.update(delta, buildings)` after vehicles/pedestrians/traffic have updated (`src/game/Game.ts:415`), which dispatches (`:73-77`):

- **On foot** — `updateOnFoot(delta, buildings)` (`:81-134`):
  1. Builds collision sets: `solid = buildings + parked-vehicle collidables` (used by player body *and* camera wall ray — moving traffic is excluded from the camera set so cars don't cause snap-jitter in the avoidance ray, comment `:83-84`); `withTraffic = solid + traffic collidables` (player solidity only). Calls `player.update(delta, input, cameraRig.yaw, withTraffic)` (`:85-87`).
  2. Camera: `cameraRig.followYaw = null` (free mouse orbit) then `cameraRig.update(..., solid)` (`:88-89`).
  3. `weapons.enabled = true`; digit keys from `WEAPON_LIST` switch weapon + viewmodel; `KeyR` reloads (`:90-99`).
  4. **Enemy melee**: for each `enemies.alive` enemy with `lastAttacked === true` within `ATTACK_RANGE² = 2.4²` m: `player.takeDamage(enemy.attackDamage)` (cop 5 / thug 8, `src/systems/EnemySystem.ts:49`), `audio.playDamage()`, `postfx.addShake(0.3)`, fires `onPlayerDamaged` (`:102-112`). The flag is reset by EnemySystem before its own update each frame (`src/systems/EnemySystem.ts:283`), so one swing = one hit.
  5. **E key arbitration**: if no mission active and E pressed → `missions.zoneAt(player.x, player.z)` first; a zone starts the mission and *consumes* E so vehicle entry can't double-fire; otherwise resolves `nearestVehicle = vehicles.getNearest(...) ?? traffic.getNearest(...)` and enters it (`:115-127`). In every other case (no press, or mission already active) it still refreshes `nearestVehicle` each frame for the HUD prompt (`:128-133`).
- **Driving** — `updateDriving(delta)` (`:138-171`):
  1. Safety: if `vehicle` is somehow null while mode is driving, snap back to `'foot'` (`:140-143`).
  2. Collision sets mirror foot mode but exclude the driven car itself from both parked and traffic lists: `vehicles.getCollidables(v)` / `traffic.getCollidables(v)` (`:147-148`).
  3. `weapons.enabled = false` (`:149`).
  4. Input mapping: `throttle = W(1)/S(-1)`, `steer = D(1)/A(-1)`; passes `{throttle, steer}` to `v.update(...)` (racing-style physics in `src/entities/Vehicle.ts:94-127`) (`:151-153`).
  5. Camera follows car heading: `cameraRig.followYaw = v.yaw` (`:155-156`).
  6. **E arbitration while driving**: if no mission active and E pressed → mission zone check first (uses the *car's* position), else `exitVehicle()`; if a mission **is** active, any E press exits (`:158-168`).
  7. `nearestVehicle = null` while driving (no enter prompts) (`:170`).
- **Death/respawn always runs last** — `handlePlayerDeath(delta)` (`:204-217`): counts `respawnTimer` down; on reaching 0 calls `player.respawnAt(SPAWN_X, SPAWN_Z)` (full heal + reposition at y=0.95, `src/entities/Player.ts:122-128`) + telemetry `playerRespawn`. When `player.health ≤ 0` and no timer is running, sets `respawnTimer = 3` s and emits `playerDied`.

**Enter transition** — `enterVehicle(v)` sets `v.occupied = v.stolen = true`, zeroes `v.speed`, switches mode, hides the player group, snaps the camera behind the car via `cameraRig.onEnterVehicle(v.yaw)` (resets mouse offset, clamps distance ≥ `MIN_DISTANCE+2`, `src/systems/CameraRig.ts:38-43`), emits telemetry `vehicleEnter` (`:175-184`).

**Exit transition** — `exitVehicle()` computes a side vector `(cos yaw, 0, -sin yaw)` (perpendicular to forward `(sin yaw, 0, cos yaw)`), places the player `2.8` m along it at `y = 0.95` (matching capsule half-height, `src/entities/Player.ts:20`), zeroes velocity, clears `occupied` (leaves `stolen = true` forever — TrafficSystem never resumes stolen cars, `src/systems/TrafficSystem.ts:125`), restores mode/camera/visibility, emits `vehicleExit` (`:186-200`).

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `PlayerMode` | `'foot' \| 'driving'` (exported type) | The two player modes (`:18`) |
| `mode` | `PlayerMode` | Current state (`:50`) |
| `vehicle` | `Vehicle \| null` | Car being driven; null on foot (`:51`) |
| `nearestVehicle` | `Vehicle \| null` | Enter-prompt candidate, refreshed per frame on foot (`:52`) |
| `respawnTimer` | `number` | Seconds until respawn; >0 means dead (`:53`) |
| `exitOffset` | `private Vector3` | Reused temp for exit placement (no allocation) (`:54`) |
| `deps` | `private readonly ModeControllerDeps` | All external references, injected once (`:56`) |

`SPAWN_X/SPAWN_Z` are exported module constants (`:20-21`) consumed by Game spawn + respawn.

## Public API

| Member | Signature | Behavior |
|---|---|---|
| `activePosition` (getter) | `(): Vector3` | Vehicle position while driving else player position — the single point everything else (world streaming, culling, minimap) tracks (`:63-65`). Read by `Game.update` before any system updates (`src/game/Game.ts:389`). |
| `activeYaw` (getter) | `(): number` | Car yaw while driving else player yaw (`:68-70`); feeds minimap rotation (`src/game/Game.ts:529-530`). |
| `update` | `(delta: number, buildings: ReturnType<World['getCollidables']>): void` | Mode tick + death timer as above (`:73-77`). `buildings` must be the active-chunk static collidables. |
| `enterVehicle` | `(v: Vehicle): void` | Transition described above (`:175-184`). Public but only called internally after `getNearest`. |
| `exitVehicle` | `(): void` | No-op if `vehicle` is null (`:187-189`); otherwise the exit sequence (`:186-200`). |
| `telemetry` (private getter) | `GameTelemetry \| undefined` | Lazy deref of `deps.telemetry?.()` so late wiring works (`:58-60`). |

State read externally through Game delegating getters: `game.mode`, `game.vehicle`, `game.nearestVehicle`, `game.respawnTimer` (`src/game/Game.ts:104-118`).

## Interactions

- **Game.ts**: constructs with deps (`:308-323`); ticks it at `:415`; gates wanted-system updates and dialogue polling to `modeCtrl.mode === 'foot'` (`:416,:419`); gates traffic-run-over checks to foot mode too (`:544`); engine audio reads `modeCtrl.vehicle` + mode (`:484-486`); weapon viewmodel uses mode for bob gating (`:443`); HUD consumes all four delegating getters (`src/ui/hud.ts:89,:126-131,:137-146` — shows `[E] Enter <name>` or `WRECKED — cannot enter` from `nearestVehicle`).
- **VehicleManager / TrafficSystem**: queried for nearest enterable car (parked priority, traffic fallback, `:122-123,:131-132`) and for collision sets with self-exclusion while driving (`:85-86,:147-148`). Writes back `occupied/stolen/speed` on enter, `occupied` on exit (`:177-179,:194`).
- **Player**: receives movement input via `player.update`, damage via `takeDamage`, respawn via `respawnAt`; visibility toggled on both transitions (`:87,:107,:181,:197,:208`).
- **CameraRig**: contract is `followYaw` (null = free orbit, number = heading lock), plus `onEnterVehicle/onExitVehicle` snap/reset (`src/systems/CameraRig.ts:25,:38-48`; writes at `:88,:155,:182,:198`).
- **MissionSystem**: `zoneAt(x,z)` → `startMission(zone)` takes priority over vehicle enter/exit on E in both modes (`:115-118,:159-163`); zone radius is `MISSION_START_DIST²` inside MissionSystem (`src/systems/MissionSystem.ts:81-88`).
- **WeaponSystem/WeaponView**: `weapons.enabled` toggled per mode (`:90,:149`); digit/R input handled only on foot (`:93-99`).
- **EnemySystem**: melee reception loop over `enemies.alive` (`:102-112`; damage values `src/systems/EnemySystem.ts:49`).
- **Telemetry**: `vehicleEnter/vehicleExit/playerDied/playerRespawn` events fired on transitions (`:183,:199,:209,:215`).
- **Update-order dependency**: `vehicles.update()` runs earlier in the same frame (`src/game/Game.ts:395` vs `:415`), so visibility flags used as a filter inside `getNearest`/`getCollidables` are fresh for the current player position.

## Tuning & Extension Points

| Constant | Value | Where | Effect |
|---|---|---|---|
| `SPAWN_X / SPAWN_Z` | `0 / 0` | `:20-21` | Respawn point (center intersection). |
| `ATTACK_RANGE` | `2.4` m (squared compare) | `:22,:106` | Max range at which an enemy's committed attack connects. |
| Exit offset | `2.8` m sideways, `y = 0.95` | `:190-191` | Where the player pops out; increase if long trucks clip the player. |
| Respawn delay | `3` s | `:214` | Death screen duration. |
| Melee feedback | shake `0.3` | `:109` | PostFX intensity per hit taken. |

Safe extensions: add new modes by extending `PlayerMode` + the dispatch in `update` (`:74-75`); add new E-actions by inserting into the two arbitration blocks (`:115-127`, `:159-168`) — note the ordering rule "mission zones consume E first" is enforced there, not globally.

## Unresolved

- The driving-mode E branch has redundant structure: when a mission is active, `else if (input.wasPressed('KeyE')) this.exitVehicle()` (`:166-168`) makes *any* E press during a mission exit the car — including a press that just started that very mission is impossible only because missions start from the foot branch or the same-frame zone check. Behavior is deterministic from source but the intent (exit-during-mission allowed?) isn't documented in code.
