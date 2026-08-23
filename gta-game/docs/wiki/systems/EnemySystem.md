# EnemySystem

## Purpose

Spawns and simulates the city's humanoid NPCs with hostile behavior: 14 wandering street thugs that chase and melee the player on line-of-sight, plus police officers spawned on demand by `WantedSystem`. Handles hit detection, death/respawn cycling, health bars, and collision separation (`src/systems/EnemySystem.ts:251-254`).

## Execution Flow

**Init** — `new EnemySystem()` in `Game` (`src/game/Game.ts:194-195`, group added to scene at `:195`). The constructor calls `generateSpawnPoints()` then instantiates one thug `Enemy` per spawn point (`src/systems/EnemySystem.ts:263-270`). Spawn generation (`:330-351`) is deterministic via `seededRng(0xbeefcafe)` (`:258`): it picks a random block (`gi/gj ∈ [0, BLOCK_COUNT)`, `BLOCK_COUNT = 8`), a random orientation (vertical road 50%), an offset across the road of `BLOCK_SIZE + 2.5 + rng·(CELL − BLOCK_SIZE − 5)` = 32.5–37.5 m from the block corner, and an along-road position of `4 + rng·(BLOCK_SIZE − 8)` = 4–26 m. A guard limits attempts to 500. Points inside the 36×36 m center square (`|x| < 18 && |z| < 18`) are rejected so the player spawn area stays calm (`:347`).

**Per-frame** — `update(dt, playerPos, collidables)` called from `Game.update` (`src/game/Game.ts:405-406`) with *only nearby building collidables*: `world.chunks.queryCircle(px, pz, 70)` — a spatial query, not the full list (`src/game/Game.ts:405`). For each enemy:

1. `lastAttacked` is reset to `false` before each enemy update so a melee hit is consumed exactly once this frame (`src/systems/EnemySystem.ts:283`).
2. **Dead enemies** (`:73-86`): play a death animation — body rotates to face-plant (`rotation.x` damped toward `-π/2`, rate 4) while sinking at 0.4 m/s; below `y < -2` the group is hidden and `respawnTimer = 20` starts. While hidden, the timer counts down; respawn happens in the system-level pass below.
3. **Line of sight** (`:97-114`): zero-allocation ray from enemy chest (y+0.9) to player head (y+0.9), max distance `dist + 0.5`; any building box intersected via `rayAABB` (`src/utils/raycast.ts:9-35`) blocks vision.
4. **State machine** (`'idle' | 'chase'`, `:37`):
   - `idle → chase` when LOS and distance < `CHASE_DIST` = 34 m (`:116-117`).
   - Thugs drop back to `idle` only when both no-LOS **and** distance > `LOSE_DIST` = 55 m (`:118-120`). Cops never leave chase (role-checked), matching their constructor initialization (`:53`).
   - Chase movement: faces the player (`atan2(toPlayer.x, toPlayer.z)`, `:124`); walks toward them at `MOVE_SPEED` = 3.6 m/s while `dist > ATTACK_RANGE` = 2.1 m (`:126-130`); inside range, if `attackCooldown <= 0`, sets `attackCooldown = ATTACK_COOLDOWN` = 1.15 s, plays a lunge (`rotation.x = -0.35`) and raises the public `lastAttacked` flag (`:131-135`). Between lunges the tilt damps back to 0 at rate 6 (`:137`).
   - Idle wander: heading does a random walk (`wanderAngle += (rng()−0.5)·0.4·dt`), position advances at `wanderSpeed · dt · 0.5` where `wanderSpeed ∈ [0.5, 1.3]` per-enemy (`:141-146`, speed rolled at `:52`).
5. **Collisions** (`resolveCollisions`, `:157-184`): closest-point push-out against building AABBs whose vertical span overlaps ground level (`box.max.y >= 0 && box.min.y <= 2.2`, `:161`) with body radius `RADIUS` = 0.45; pairwise separation from other live enemies within `RADIUS·2.2` ≈ 0.99 m, each pushed half the overlap (`:172-183`). Position is finally clamped to ±(`CITY_HALF − 2`) = ±153 m (`:150-151`).
6. Health bar refresh via `e.updateHealthBar()` (`:285`, implementation `:243-248`).

**Respawn pass** (`:289-300`): any dead, hidden enemy with `respawnTimer <= 0` is restored — `health = 100`, visible, teleported back to its original spawn point, rotation zeroed.

## Data Structures

- `enemies: Enemy[]` — flat array holding the 14 initial thugs **and** every cop ever spawned (`src/systems/EnemySystem.ts:256`). Index-aligned with `spawnPoints: Array<[number, number]>` (`:259`); `spawnCop` pushes to both (`:310-316`), `removeEnemy` splices both at the same index (`:319-327`).
- Per-enemy combat state: `health = 100`, `dead`, `attackCooldown`, `hitRadius = 0.62`, `hitHeight = 1.8` (capsule for hitscan), `respawnTimer`, `role: 'thug' | 'cop'`, `attackDamage` (cop **5**, thug **8**, fixed at construction `:49`), `lastAttacked` frame flag (`:27-33`, `154-155`).
- Visuals built procedurally in `buildBody()` (`:186-238`): box-primitive body/head/cap/band/legs/arms; cops get blue cloth `0x1f3a5f` + gold badge `0xffd700`, thugs purple-brown `0x3a2f45` (HSL-jittered ±0.06 lightness) + red band `0xc0392b`; billboard health bar at y = 2.0 with red fill `0xe74c3c` scaled to `health/100` and re-centered by shifting x by `-(1-pct)·0.33`.

## Public API

```ts
// EnemySystem
get alive(): Enemy[]            // :272 — filter !dead (allocates a new array each call)
get aliveCount(): number        // :276
update(dt, playerPos, collidables): void          // :280
damageEnemy(enemy: Enemy, damage: number): boolean // :303 — applies damage, fires onEnemyDeath on kill, returns killed
spawnCop(x: number, z: number): Enemy             // :310 — new role-'cop' Enemy appended to enemies+spawnPoints+group
removeEnemy(enemy: Enemy): void                   // :319 — splices enemies & spawnPoints, detaches group

// Enemy
takeDamage(amount: number): boolean // :61 — returns true exactly when this hit kills
update(dt, playerPos, collidables, enemies): void // :72
updateHealthBar(): void             // :243
position: Vector3                   // :57 — alias of group.position
```

Callback: `onEnemyDeath?: (enemy: Enemy) => void` (`:260`).

## Interactions

Callers/callees:
- `Game` owns the instance (`src/game/Game.ts:194`), ticks it (`:406`), passes it to `WeaponSystem` (`:242`), wires `onEnemyDeath` → drop an ammo pickup at the corpse + cop-kill crime (`:297-300`), and exposes it to `ModeController` deps (`:318`).
- `WeaponSystem.shoot()` ray-casts capsules against `enemies.alive` (`hitRadius`/`hitHeight`, `src/systems/WeaponSystem.ts:231-237`) and applies weapon damage through `damageEnemy` (`:252`; e.g. pistol 34, SMG 18, shotgun 16×6 pellets, rifle 30 — `src/data/weapons.ts`).
- `ModeController` consumes `lastAttacked`: any attacking enemy within 2.4 m of the player deals its `attackDamage` (thug 8 / cop 5) with audio + 0.3 camera shake (`src/systems/ModeController.ts:101-112`, range constant `ATTACK_RANGE = 2.4` at `:22`). This two-step flag handoff is why an idle player can be worn down: 100 HP ÷ 8 damage = 9 hits at ≥1.15 s apart → observed 100→28 after 9 thug hits.
- `WantedSystem` calls `spawnCop`/`removeEnemy` (`src/systems/WantedSystem.ts:80,84`).
- `MissionSystem` reads `enemies[targetId]` for assassination targets (`src/systems/MissionSystem.ts:147,185`).

## Tuning & Extension Points

Actual constants (`src/systems/EnemySystem.ts:14-21`):

| Constant | Value | Effect |
|---|---|---|
| `ENEMY_COUNT` | 14 | Initial thugs (cop spawns are extra). |
| `CHASE_DIST` | 34 m | Aggro radius (requires LOS). |
| `LOSE_DIST` | 55 m | Thug give-up radius (also needs no-LOS). |
| `ATTACK_RANGE` | 2.1 m | Melee trigger distance (enemy-side). |
| `ATTACK_COOLDOWN` | 1.15 s | Time between melee swings. |
| `MOVE_SPEED` | 3.6 m/s | Chase speed (player walk is 5.5 — outrunnable). |
| `HIT_RADIUS` | 0.62 m | Hitscan capsule radius. |
| `RADIUS` | 0.45 m | Body collision radius. |
| respawn delay | 20 s | Set when the corpse finishes sinking (`:80`). |
| LOS eye height | 0.9 m | `:101,104`. |
| calm zone | \|x\|,\|z\| < 18 m | No spawn points downtown (`:347`). |

Extension: roles are data-driven enough for new variants — add a branch in `Enemy`'s constructor for `attackDamage`/start-state (`:49-53`) and colors in `buildBody` (`:186-196`). Spawn-point regeneration logic is reusable for extra waves.

## Unresolved

- `alive` allocates a filtered array on every access and is called multiple times per frame (weapon loop `src/systems/WeaponSystem.ts:231`, ModeController loop `src/systems/ModeController.ts:102`) — fine at n≈17, worth caching above ~50 entities.
- `removeEnemy` assumes `enemies` and `spawnPoints` stay index-aligned (`src/systems/EnemySystem.ts:323-324`); currently true because both are only ever mutated in tandem, but nothing enforces it.
- Assassination `targetId` indexes into the shared array (`src/systems/MissionSystem.ts:185`); if `WantedSystem` removes a cop positioned before index 3, the mission's target silently shifts identity.
- Enemies have no vertical navigation or roof awareness: LOS ignores anything below y=0 / above y=2.2 for collision but the vision ray itself is blocked by *any* box, including low props.
