# WantedSystem

## Purpose

GTA-style 6-star wanted meter. Crimes raise stars 1..6; stars decay when the player behaves; from 2 stars police officers spawn near the player, chase them on foot, and are despawned when the meter clears (`src/systems/WantedSystem.ts:11-18`).

## Execution Flow

**Init** — constructed once in `Game` with the shared `EnemySystem`: `new WantedSystem(this.enemies)` (`src/game/Game.ts:204`). Initial state: `stars = 0`, `heat = 0`, `lastCrime = -999` (so the first frame can already be inside the decay window harmlessly), `dropTimer = 0`, `copTimer = 0`, empty `cops` array (`src/systems/WantedSystem.ts:20-25`).

**Per-frame** — `update(dt, playerPos)` runs every frame *only while the player is on foot* (`src/game/Game.ts:416`); stars therefore do not decay and cops do not spawn while driving.

1. Star decay (`src/systems/WantedSystem.ts:51-60`): if `stars > 0` and `now - lastCrime > HEAT_DECAY_TIME` (14 s since the last crime), `dropTimer` accumulates `dt`; every `STAR_DROP_INTERVAL` (8 s) one star is dropped and `dropTimer` resets. When stars hit 0, `clearCops()` removes all spawned cops. Any crime inside the 14 s window takes the `else` branch and zeroes `dropTimer` (`src/systems/WantedSystem.ts:58-59`) — i.e. each crime restarts the full grace period, not just the drop countdown.
2. Police response (`src/systems/WantedSystem.ts:63-67`): `copTimer` ticks down every frame. If `stars >= POLICE_AT_STARS` (2), fewer than `MAX_COPS` (3) cops exist, and `copTimer <= 0`, it sets `copTimer = 6` and spawns one cop. Net effect: one new cop every 6 s while at 2+ stars, hard cap 3 alive.
3. Cop placement (`src/systems/WantedSystem.ts:70-81`): random angle around the player, distance `50 + Math.random() * 30` (50–80 m). The resulting XZ is independently snapped to the nearest road centerline via `nearestRoad()` against `ROADS_X` / `ROADS_Z` (`src/systems/WantedSystem.ts:93-104`, lines defined in `src/systems/CityGenerator.ts:28-31`), then clamped to `±(CITY_HALF - 8)` = ±147 m (`src/systems/CityGenerator.ts:9`). Snapping X and Z separately means cops effectively appear on/near intersections coming "from the streets".

**Crime intake** — `reportCrime(severity, playerPos)` (`src/systems/WantedSystem.ts:30-44`):
- Always stamps `lastCrime = performance.now() / 1000` (`:31`).
- `severity >= 2` (instant crimes): `stars = clamp(max(stars, severity === 3 ? stars + 2 : severity), 1, MAX_STARS)` and `heat = 0` (`:32-34`). So a civilian kill (severity 2) forces *at least* 2 stars; a cop kill (severity 3) adds +2 on top of current stars (clamped to 6).
- `severity 1` (gunfire) is heat-based: `heat += 1`; the third heat point within a window converts to +1 star and resets heat (`:36-41`). Three separate shots near cops are needed for the first star via gunfire.
- `playerPos` is accepted but explicitly discarded with `void playerPos` (`:43`) — crimes are position-independent.

## Data Structures

| Field | Type | Meaning |
|---|---|---|
| `stars` | `number` (public, 0–6) | Current wanted level; read by HUD (`src/ui/hud.ts:179-181`), telemetry (`src/game/Game.ts:436-438`), pause stats (`src/game/Game.ts:608`). |
| `heat` | `private number` | Gunfire accumulator; 3 hits = 1 star (`src/systems/WantedSystem.ts:36-41`). |
| `lastCrime` | `private number` | Wall-clock seconds of last crime; gates decay (`:51`). |
| `dropTimer` | `private number` | Seconds accumulated toward the next star drop (`:52`). |
| `copTimer` | `private number` | Countdown to next cop spawn attempt (`:63`). |
| `cops` | `private Enemy[]` | Only cops *this system* spawned; original thugs are never in here (`:25`). |

## Public API

```ts
constructor(enemies: EnemySystem)                     // :27 — needs the enemy pool to spawn/remove cops
reportCrime(severity: number, playerPos: Vector3): void // :30 — 1=gunfire, 2=civilian killed, 3=cop killed
update(dt: number, playerPos: Vector3): void          // :47 — decay + cop spawning; call only on foot
dispose(): void                                       // :88 — clearCops()
```

`spawnCop(playerPos)` (`:70`) and `clearCops()` (`:83`) are private.

## Interactions

Callers (all crime sources live in `Game.ts`):
- Shooting while any live cop is within 55 m → `reportCrime(1, p)` (`src/game/Game.ts:255-263`, distance check `dx*dx+dz*dz < 55*55` at `:259`), fired from the `WeaponSystem` `onShoot` hook (`src/systems/WeaponSystem.ts:206`).
- Killing a civilian (pedestrian) via `onKill('civilian')` → `reportCrime(2, ...)` (`src/game/Game.ts:265-270`).
- Running over pedestrians with a car: kill → severity 2, knock-down → severity 1 (`src/game/Game.ts:515-520` in `checkCarPedestrianCollisions`).
- Killing a cop, via `enemies.onEnemyDeath` → `reportCrime(3, ...)` (`src/game/Game.ts:297-300`).

Callees:
- `enemies.spawnCop(x, z)` (`src/systems/WantedSystem.ts:80` → `src/systems/EnemySystem.ts:310-316`) — appends a `role: 'cop'` Enemy that starts permanently in `'chase'` state (`src/systems/EnemySystem.ts:53`), dealing 5 damage per melee hit (`:49`).
- `enemies.removeEnemy(cop)` on wanted-clear/dispose (`src/systems/WantedSystem.ts:84` → `src/systems/EnemySystem.ts:319-327`).

Consumers: `window.game.wanted` is reachable in the console (`src/main.ts:78` exposes the whole `Game`), so `window.game.wanted.reportCrime(3, pos)` works at runtime. Telemetry `wantedChanged(stars)` fires on every star change (`src/game/Game.ts:436-438`); HUD renders `'★'.repeat(stars)` (`src/ui/hud.ts:180`).

## Tuning & Extension Points

Actual constants (`src/systems/WantedSystem.ts:5-9`):

| Constant | Value | Effect |
|---|---|---|
| `MAX_STARS` | 6 | Hard ceiling for clamping. |
| `POLICE_AT_STARS` | 2 | First star count that triggers cop spawns. |
| `MAX_COPS` | 3 | Max simultaneous spawned cops. |
| `HEAT_DECAY_TIME` | 14 s | Crime-free time before any star can drop. |
| `STAR_DROP_INTERVAL` | 8 s | Time per dropped star once decaying. |
| cop respawn cadence | 6 s | Literal in `update` (`:65`). |
| spawn ring | 50 + rand·30 m | Literals in `spawnCop` (`:72`). |
| city clamp | ±(`CITY_HALF − 8`) = ±147 m | `:78-79`, `CITY_HALF = 155` (`src/systems/CityGenerator.ts:9`). |

Extension points: severity semantics are convention-only (any integer works); adding a new crime type is just another `reportCrime(n, pos)` call site. Road snapping depends on `ROADS_X`/`ROADS_Z` being identical grids (`src/systems/CityGenerator.ts:28-31`).

## Unresolved

- **`reportCrime(3, pos)` from 0 stars yields 2 stars, not 3+**: `max(0, 0 + 2)` clamps to 2 (`src/systems/WantedSystem.ts:33`). It does immediately enable cop spawning (`POLICE_AT_STARS = 2`), but "≥3 stars" only holds if the player already had ≥1 star. Repeating the call escalates: from 2 stars a second call gives 4.
- Dead cops still occupy slots in `this.cops` (only `clearCops` removes them, `src/systems/WantedSystem.ts:56,83-86`), so at `MAX_COPS` no reinforcements spawn while corpses persist — the cap is effectively "cops ever spawned this spree", not "alive".
- Stars freeze entirely while driving (`update` gated on foot mode, `src/game/Game.ts:416`) — cops also stop spawning mid-chase if you get in a car.
