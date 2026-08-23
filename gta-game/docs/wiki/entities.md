# Entities

## Purpose

The only two gameplay entity classes: `Player` (third-person on-foot controller — camera-relative WASD with inertia, gravity/jump, sprint stamina, capsule-vs-AABB collision) and `Vehicle` (enterable car — throttle/brake/reverse/friction scalar-speed model, yaw steering with visual roll, AABB building collision, impact damage). Neither class owns its input or its mode transitions: `ModeController` reads `InputManager` and calls into them (see game-loop.md). Both are pure three.js primitives, no GLTF assets.

## Execution Flow

### Player

**Construction** — src/entities/Player.ts:49-58: builds a ~1.9 m humanoid from box/sphere primitives (`buildHumanoid`, src/entities/Player.ts:61-106: legs/shoes/torso/arms/hands/head+hair cap, all `castShadow`+`receiveShadow`; a nose sphere at z=−0.19 marks the −Z facing direction so yaw is visible, src/entities/Player.ts:103). Initial `group.position.set(0,0,0)` — immediately overridden by `Game` to `(SPAWN_X=0, 0.95, SPAWN_Z=0)` — src/game/Game.ts:182. `rotation.order = 'YXZ'`. Feet sit at local y=0; the group origin is the *center* of a virtual capsule of half-height 0.95 (hence spawn/rest y = 0.95).

**Per-frame update** — called once per frame from `ModeController.updateOnFoot` as `player.update(delta, input, cameraRig.yaw, withTraffic)` where `withTraffic` = buildings ∪ parked vehicles ∪ traffic cars — src/systems/ModeController.ts:85-87. Steps in exact order (src/entities/Player.ts:130-188):

1. Camera-relative steering basis: `forward = (sin(yaw),0,cos(yaw))`, `right = forward × UP`; move axes `D−A`, `S−W`; direction normalized when any key held — src/entities/Player.ts:132-143.
2. Body yaw damped toward camera yaw with λ=8 ("GTA-style: character turns with camera") — src/entities/Player.ts:146-147.
3. Sprint gating: wantSprint = Shift held **and** has input; canSprint additionally requires `stamina > 0.01`; speed becomes `SPRINT_SPEED` else `WALK_SPEED` — src/entities/Player.ts:150-152.
4. Stamina: drain `22/s` while sprinting (floored at 0); regen `14/s` only when `grounded && !wantSprint` — src/entities/Player.ts:154-158.
5. Horizontal inertia (exponential approach): `k = 1 − e^(−accel·dt)` with accel `10` grounded / `2.5` airborne; velocity.xz lerped toward `dir·speed` — src/entities/Player.ts:161-166.
6. Gravity: `vy −= 26·dt`, terminal fall clamped at `−28 m/s` — src/entities/Player.ts:169-170.
7. Jump: `Space` edge + `grounded` → `vy = 9.2`, `grounded=false` — src/entities/Player.ts:172-175.
8. Integrate position += velocity·dt on all axes — src/entities/Player.ts:178-180.
9. `resolveGround(collidables)` then `resolveCollisions(collidables)` — src/entities/Player.ts:182-183.
10. World-bounds clamp to `±WORLD_HALF` where `WORLD_HALF = CITY_HALF − 3 = 152` — src/entities/Player.ts:23,186-187.

**Ground resolution** — src/entities/Player.ts:191-211: flat floor y=0 plus every collidable whose XZ footprint contains the player center contributes its top face if `box.max.y ≤ position.y + 0.4` (step-up reach); grounded when `position.y ≤ groundY + 0.95 + 0.01`; while falling (`vy ≤ 0`) snap `y = groundY + 0.95` and zero vy.

**Wall resolution** — src/entities/Player.ts:214-242: for each AABB with vertical overlap against `[y−0.95, y+0.95]`: closest-point-on-footprint test at radius `RADIUS=0.45`; outside-center case pushes radially out by `RADIUS − d`; dead-center case (d² ≤ 1e-9) pushes along the axis of least penetration by `pen + RADIUS`.

### Vehicle

**Construction** — `new Vehicle(config: VehicleData, x, z, yaw)` — src/entities/Vehicle.ts:50-59: `health = config.maxHealth`, hitbox half-extents `{width/2, length/2}`, procedural body built from primitives (body box at y=h·0.32, cabin at y=h·0.62 offset −l·0.08, front/rear bumpers, 4 cylinder wheels rotated z=π/2 spinning on x, emissive headlights) — src/entities/Vehicle.ts:194-247. Group placed at `(x, 0, z)` — cars ride at ground plane y=0, no suspension.

**Per-frame update** — driven two ways:
- *Human driving*: `v.update(dt, {throttle: W−S, steer: D−A}, withTraffic)` from `ModeController.updateDriving` (weapons disabled there) — src/systems/ModeController.ts:149-153.
- *AI driving*: `aiDrive(dt, targetYaw, targetSpeed, collidables)` from TrafficSystem — steer toward heading via angle-wrapped diff clamped to `turnRate·0.7·dt`, accelerate/brake toward target speed at `0.8×` rates; wrecked AI targets speed 0 — src/entities/Vehicle.ts:133-153.

`update` order (src/entities/Vehicle.ts:94-127):
1. Effective max speed: wrecked caps at `maxSpeed · 0.25` — src/entities/Vehicle.ts:97.
2. Throttle > 0: `speed += acceleration·throttle·dt`, clamp maxSpeed — src/entities/Vehicle.ts:99-101.
3. Throttle < 0: if moving forward (>0.5) brake at `brakeForce` (clamp ≥ 0), else reverse at `acceleration·0.6` clamp ≥ `−reverseMax` — src/entities/Vehicle.ts:102-111.
4. Coast (throttle 0): friction per frame `speed *= friction^(dt·60)` (frame-rate compensated), snap |speed| < 0.05 → 0 — src/entities/Vehicle.ts:113-116.
5. Steering authority scales with motion: `steerEffect = clamp(|speed|/6, 0, 1)`; `yaw += steer · turnRate · sign(speed) · steerEffect · dt` (reversing steers inverted via sign) — src/entities/Vehicle.ts:119-120.
6. `integrate(dt, rollTarget)` where rollTarget `= −steer·rollFactor·steerEffect·sign(speed)` — position advances along `(sin yaw, cos yaw)`, body roll damped λ=10, wheels spin `Δrot = (speed/wheelRadius)·dt`, collidable-box cache invalidated — src/entities/Vehicle.ts:122,156-166.
7. `resolveCollisions(collidables)` → `resolveWorldBounds()` → `applyImpactDamage(dt)` — src/entities/Vehicle.ts:123-126.

**Building collision** — src/entities/Vehicle.ts:250-283: rotated footprint approximated conservatively by an AABB of half-extents `rx = hx·|cos| + hz·|sin|`, `rz = hx·|sin| + hz·|cos|` vs vertical span `[0, height]`; overlap resolved along the smaller penetration axis; any impact above 2 m/s cuts `speed ×= 0.62`; `lastCollided` latched for the damage pass. Same rotated-extent math backs the cached public `getCollidableBox()` (y-range `[0, config.height]`) used for vehicle-vs-vehicle, camera avoidance, and player-hit tests — src/entities/Vehicle.ts:78-92.

**Impact damage** — src/entities/Vehicle.ts:179-185: if last frame's collision happened and `|speed| > IMPACT_DAMAGE_THRESHOLD (5 m/s)`, damage `(|speed| − 5) · IMPACT_DAMAGE_SCALE (4.5)` applied ×dt×60 ("frame-rate independent-ish").

### Death / respawn (Player)

- `takeDamage(amount)` is a no-op once dead (returns false); otherwise subtracts and returns the "just died" boolean — src/entities/Player.ts:112-116. Callers ignore the return value; death detection is done by polling `health <= 0`.
- Damage sources: enemy melee within `ATTACK_RANGE = 2.4` m (thugs deal 8, cops 5 — src/systems/ModeController.ts:101-112), traffic impacts (src/game/Game.ts:559).
- `ModeController.handlePlayerDeath` runs every frame regardless of mode: if `respawnTimer > 0` it counts down and on expiry calls `player.respawnAt(SPAWN_X, SPAWN_Z)` (+telemetry); otherwise if `health <= 0` it arms `respawnTimer = 3` s — src/systems/ModeController.ts:204-217.
- `respawnAt(x,z)`: health = maxHealth (100), stamina = 100, velocity zeroed, position `(x, 0.95, z)`, group visible again — src/entities/Player.ts:122-128. Mode stays whatever it was; since all damage paths are foot-mode-gated (traffic check requires `mode === 'foot'`, src/game/Game.ts:544; melee only ticks inside `updateOnFoot`), death in practice always happens on foot, hence respawn lands in `mode='foot'` at the origin.

### Enter / exit vehicle state changes

All in ModeController — src/systems/ModeController.ts:175-200:

- **Enter (KeyE on foot, no active mission)**: nearest enterable car found by `vehicles.getNearest ?? traffic.getNearest` within `ENTER_DIST = 3.6` m (wrecked/invisible excluded) — src/systems/ModeController.ts:121-127, src/systems/VehicleManager.ts:9,52-66. `enterVehicle(v)` sets `v.occupied=true`, `v.stolen=true` (AI never resumes it), `v.speed=0`, `modeCtrl.mode='driving'`, hides the player group, snaps camera behind car via `cameraRig.onEnterVehicle(v.yaw)` (mouse offset reset, distance re-clamped ≥ MIN_DISTANCE+2) — src/systems/CameraRig.ts:38-43.
- While driving: weapons disabled (src/systems/ModeController.ts:149), wanted system frozen (src/game/Game.ts:416), engine audio keyed off `|speed|/maxSpeed` (src/game/Game.ts:483-491), HUD swaps health bar for vehicle-health bar (src/ui/hud.ts:123-131).
- **Exit (KeyE while driving)**: player placed at `vehicle.position + (cos yaw, 0, −sin yaw)·2.8` (left-side lateral offset), y forced back to 0.95, velocity zeroed, `occupied=false`, `mode='foot'`, player visible, camera returns to free orbit — src/systems/ModeController.ts:186-200. A mission zone under the car consumes E first so exit doesn't double-fire — src/systems/ModeController.ts:159-168.
- Safety net: mode 'driving' with null vehicle snaps straight back to 'foot' — src/systems/ModeController.ts:140-144.

## Data Structures

**Player fields** — src/entities/Player.ts:35-47: `group: Group` (world transform = capsule center), `velocity: Vector3` (persistent across frames — traffic knockback writes directly into it, src/game/Game.ts:565), `yaw`, `grounded=true`, `stamina`, `maxHealth=100`, `health=100`, plus three scratch vectors (zero-allocation update loop).

**Vehicle fields** — src/entities/Vehicle.ts:30-48: `config: VehicleData` (shared immutable spec), `speed` (**signed scalar along forward**, not a vector), `yaw`, `health`, `wrecked`, `occupied`, `stolen`, cached Box3 + dirty flag (recomputed only after movement), wheel mesh refs.

**VehicleData specs** — src/data/vehicles.ts:26-93:

| Spec | Sedan | Taxi | Muscle | Truck |
|---|---|---|---|---|
| acceleration (m/s²) | 11 | 11 | 16 | 7 |
| maxSpeed (m/s) | 24 | 22 | 30 | 17 |
| reverseMax (m/s) | 8 | 8 | 9 | 6 |
| brakeForce (m/s²) | 18 | 18 | 22 | 14 |
| friction (/s mult) | 0.985 | 0.985 | 0.982 | 0.99 |
| turnRate (rad/s) | 1.7 | 1.7 | 1.5 | 1.0 |
| rollFactor | 0.06 | 0.06 | 0.08 | 0.04 |
| W×H×L (m) | 2.1×1.5×4.6 | 2.1×1.5×4.6 | 2.2×1.4×4.8 | 2.6×2.2×6.4 |
| wheelRadius | 0.38 | 0.38 | 0.42 | 0.5 |
| maxHealth | 100 | 100 | 100 | 150 |

Taxi is `{...VEHICLE_SEDAN, name:'Taxi', colors, maxSpeed:22}` — src/data/vehicles.ts:44-51.

## Public API

**Player** — src/entities/Player.ts:34-243: `position` getter (aliases group.position), `velocity`, `yaw`, `grounded`, `stamina`, `maxHealth`, `health`; `takeDamage(amount): boolean` (true iff this hit killed), `heal(amount)` (clamped to maxHealth), `respawnAt(x,z)`, `update(dt, input, cameraYaw, collidables)`.

**Vehicle** — src/entities/Vehicle.ts:29-296: `position`, `config`, `speed`, `yaw`, `health`, `wrecked`, `occupied`, `stolen`; `forwardInto(target)` (allocation-free forward vector, src/entities/Vehicle.ts:66-68), `speedKmh` getter (`|speed|·3.6`), `getCollidableBox(): Box3` (cached), `update(dt, controls, collidables)`, `aiDrive(dt, targetYaw, targetSpeed, collidables)`, `takeDamage(amount)` (ignored when wrecked; sets `wrecked=true, speed=0` at 0 HP — src/entities/Vehicle.ts:168-176), `repair()` (full health, un-wreck).

## Interactions

- **Player ↔ InputManager**: `isDown` for held keys (W/A/S/D/Shift/Space), `wasPressed('Space')` for jump edges; virtual keys injected by MobileControls flow through the same API — src/utils/InputManager.ts:93-108,147-157.
- **Player ↔ CameraRig**: receives `cameraRig.yaw` as movement basis; camera itself ignores the player during driving (`followYaw = vehicle.yaw`) — src/systems/CameraRig.ts:54, src/systems/ModeController.ts:155-156.
- **Player ↔ WeaponView**: viewmodel holder is parented to `player.group`, so hiding the group also hides the gun while driving — src/game/Game.ts:186-187,441-443.
- **Player ↔ Game collision extras**: parked vehicles are solid to the player (`vehicles.getCollidables()` appended in ModeController, src/systems/ModeController.ts:85); traffic cars are solid too AND separately checked for high-speed hits (src/game/Game.ts:543-569). Roof-walking works because building top faces feed `resolveGround` (reach window +0.4 m).
- **Vehicle ↔ VehicleManager**: manager owns 20 deterministically-parked cars + 4 guaranteed starter cars around spawn (e.g., sedan at (0,7) facing north, taxi at (0,−8) facing south) and hides them beyond 95 m — src/systems/VehicleManager.ts:7-50,81-109.
- **Vehicle ↔ TrafficSystem**: hijacked traffic cars get `stolen=true` and are excluded from their own collision list via `getCollidables(v)` / `traffic.getCollidables(v)` exclusion args — src/entities/Vehicle.ts:39-40, src/systems/ModeController.ts:146-148.
- **Vehicle ↔ explosions**: `Game.updateExplosions` watches `wrecked` flags each frame → one-shot particle boom + positional audio + shake 0.9, then continuous smoke — src/game/Game.ts:470-481.
- **Save/load**: player pos (x,z) + health + kills persist via SaveManager; restored y forced to 0.95 — src/game/Game.ts:571-590.

## Tuning & Extension Points

All Player physics constants — src/entities/Player.ts:14-27:

| Constant | Value | Meaning |
|---|---|---|
| GRAVITY | 26 m/s² | snappier than real g |
| JUMP_SPEED | 9.2 m/s | apex ≈ v²/2g ≈ 1.63 m above feet |
| WALK_SPEED | 5.5 m/s | steady-state walk cap |
| SPRINT_SPEED | 9.5 m/s | sprint cap (also weapon-view bob reference /9.5) |
| ACCEL_GROUND / ACCEL_AIR | 10 / 2.5 /s | exponential inertia rates |
| HALF_HEIGHT | 0.95 | capsule half-height; rest y = 0.95 |
| RADIUS | 0.45 | wall push-out radius |
| MAX_FALL | −28 m/s | terminal velocity |
| WORLD_HALF | 152 | CITY_HALF(155) − 3 bound clamp |
| SPRINT_DRAIN | 22 /s | e.g. full→empty in ~4.5 s |
| STAMINA_REGEN | 14 /s | grounded non-sprint only |
| STAMINA_MAX | 100 | |

Sanity checks against runtime observations: sprint drain 100 → 100 − 22·0.8 = **82.4** predicted vs 81.94 observed over 0.8 s ✓ (frame quantization); jump apex continuous **2.58** (= 0.95 + 1.63) vs ≈2.53 observed ✓ (discrete integration shaves a few cm).

Vehicle tuning knobs: `IMPACT_DAMAGE_THRESHOLD = 5` m/s, `IMPACT_DAMAGE_SCALE = 4.5` hp/(m/s) — src/entities/Vehicle.ts:16-17; world bound `CITY_HALF − 3` with ×0.5 speed penalty on clamp — src/entities/Vehicle.ts:15,285-295; wrecked crawl multiplier 0.25 — src/entities/Vehicle.ts:97; reverse power fraction 0.6 — src/entities/Vehicle.ts:109; AI turn/accel scale 0.7/0.8 — src/entities/Vehicle.ts:139-147.

Extension points: new vehicle archetypes are pure data rows in `VEHICLE_CONFIGS` (picked up automatically by parked spawning, src/data/vehicles.ts:88-93); new player verbs belong in `ModeController.updateOnFoot` (the E-key handler shows the pattern: mission zones consume input before vehicle entry, src/systems/ModeController.ts:115-133).

## Unresolved

- **HP auto-regen is NOT implemented in current source.** `Player.heal()` exists but has zero callers anywhere in src (grep-verified; only definition at src/entities/Player.ts:118), and no code path raises `health` besides `respawnAt`/save-load. The project checklist itself flags "⚠️ tanpa auto-regen" — GTA_GAMEPLAY_CHECKLIST.md:39. The observed idle recovery 28 → 68 cannot be reproduced from this code; likely from an older build or a misread of the stamina bar. If regen is desired: add `this.health = Math.min(this.maxHealth, this.health + RATE*dt)` gated on time-since-damage in `Player.update`.
- Observed walk speed "~6.5 m/s" exceeds the hard cap `WALK_SPEED = 5.5` (velocity converges asymptotically *below* target; nothing adds forward displacement except push-out). Same caveat as above.
- Observed respawn "~3.2 s" vs the coded 3.0 s timer (src/systems/ModeController.ts:214): consistent with the delta clamp at 0.05 s (src/game/Game.ts:376) making the countdown lag wall-clock below 20 fps, not a separate constant.
- The prompt's phrase "mode='vehicle'" is loose: the actual enum value set by KeyE entry is `mode='driving'` (`type PlayerMode = 'foot' | 'driving'`) — src/systems/ModeController.ts:18,180.
- `takeDamage`'s boolean kill-return is dead API — no caller consumes it (checked src/game/Game.ts:559, src/systems/ModeController.ts:107).
