# MissionSystem

## Purpose

Data-driven mission layer: world start zones, four objective types (delivery / race / assassination / chase), 3D waypoint markers with minimal per-frame churn, and the money/XP/level progression profile persisted to localStorage (`src/systems/MissionSystem.ts:39-43`).

## Execution Flow

**Init** — constructed in `Game` with three closures: the shared `EnemySystem`, `() => this.player.position`, and `() => this.traffic.cars.map(c => c.vehicle)` (`src/game/Game.ts:207-211`). Its `markers` Group is added to the scene (`src/game/Game.ts:212`). Initial profile is `{ money: 0, xp: 0, level: 1, done: [], started: [] }` (`src/systems/MissionSystem.ts:47`); saved profiles are restored in `Game.loadSave()` via `deserialize` (`src/game/Game.ts:585`). Hooks are wired right after construction (`src/game/Game.ts:213-223`).

**Mission start** — `ModeController` polls `missions.zoneAt(x, z)` when the player presses **E** (on foot at `src/systems/ModeController.ts:115-118`, driving at `:159-163`) and calls `startMission(zone)`. `zoneAt` matches any *available* mission whose start point is within squared distance `MISSION_START_DIST²` = 4.5 m (`src/systems/MissionSystem.ts:81-88`, constant `src/data/missions.ts:83`). `startMission` (`:90-111`) no-ops if a mission is already active, records the id in `profile.started`, initializes `ActiveMission { objective: 0, startTime: performance.now(), followTime: 0 }`, and for chase missions selects one random unoccupied, unwrecked traffic vehicle as target, boosting its speed to at least 14 m/s while remembering the original (`:99-108`). Fires `hooks.onMissionStart` then emits the first objective text.

**Per-frame** — `update(dt)` runs every frame from `Game.update` (`src/game/Game.ts:425`):
1. `updateMarkers()` always runs (even with no active mission, to show start zones) (`:155-157`).
2. Objective checks by type (`:162-202`):
   - **delivery**: within `WAYPOINT_DIST` = 6 m of pickup advances `objective 0 → 1`; reaching the dropoff completes (`:163-173`).
   - **race**: each checkpoint reached within 6 m advances; completing the last one finishes (`:175-182`). `assassination_1` has 6 checkpoints (`src/data/missions.ts:49-56`).
   - **assassination**: completes when `enemies.enemies[targetId]` is missing or `dead` — checked every frame, no player-proximity requirement (`:184-188`).
   - **chase**: if the target car vanished → complete immediately as consolation (`:190-192`); otherwise each frame spent inside `followRange` (35 m, squared check `:196`) accumulates `followTime`; at `followTime` = 12 s it completes (`:197-198`). Time outside the radius does not decay.
3. Marker diffing (`updateMarkers`, `:254-271`): recomputes `markerPositions()` each frame but only *rebuilds* meshes when the marker count or any color changed (mission start/complete/objective transitions); otherwise it just copies positions onto existing groups — moving assassination/chase waypoints reposition without allocation or geometry disposal.

**Completion** — `complete()` (`:221-233`): restores the chase car's original speed, credits `addReward(def.reward, def.xp)` (level recomputed as `floor(xp/100)+1`, `:35-37`), appends to `profile.done`, clears state, fires `onMissionComplete(def, reward)` (which triggers an auto-save in Game, `src/game/Game.ts:217-222`), and rebuilds markers.

## Data Structures

- `Profile { money, xp, level, done: string[], started: string[] }` (`:13-19`) — the only serialized state.
- `ActiveMission { def, objective, startTime, followTime }` (`:21-27`) — `objective` is type-dependent: delivery stage 0/1, race checkpoint index; `startTime` is recorded but never read.
- `markerCache: Array<{ group: Group, color: number }>` (`:295`) — live marker meshes for diffing.
- `MISSIONS: MissionDef[]` (`src/data/missions.ts:27-81`), exactly **4 definitions**:

| id | name | type | start | reward | xp | req. lvl | specifics |
|---|---|---|---|---|---|---|---|
| `delivery_1` | PIZZA DELIVERY | delivery | (−60, 60) | $150 | 60 | 1 | pickup (−62,58), dropoff (92,−64) |
| `race_1` | MIDTOWN SPRINT | race | (82, −52) | $250 | 90 | 1 | 6 checkpoints around the map perimeter |
| `assassination_1` | THUG CLEANUP | assassination | (−92, −84) | $400 | 150 | 2 | `targetId: 3` (index into `enemies`) |
| `chase_1` | TAIL THE TARGET | chase | (104, 64) | $350 | 120 | 2 | followRange 35 m, followTime 12 s |

Marker visuals (`makeMarker`, `:320-349`): vertical light beam 0.35×14×0.35 (basic mat, opacity 0.5, y=7), floating rotated "ring" box 1.6³ (opacity 0.9, y=1.2), emissive base plate 2.2×0.15×2.2 (emissiveIntensity 0.6). Available-mission zones render green `0x2ecc71` at y 1.2; the active waypoint renders yellow `0xffd166` at y 1.4 (`:208-219`).

## Public API

```ts
addReward(money: number, xp: number): void            // :61 — credit profile + recompute level
availableMissions(): MissionDef[]                     // :68 — level met && not done && not started
startedMission(id: string): boolean                   // :74
zoneAt(x: number, z: number): MissionDef | null       // :81 — start zone under position (4.5 m)
startMission(def: MissionDef): void                   // :90 — ignored while a mission is active
objectiveText(): string                               // :114 — live text incl. distances/timer (active! non-null asserted)
waypoint(): Vector3 | null                            // :133 — current goal pos; null for dead assassination targets
update(dt: number): void                              // :155
markerPositions(): Array<{ pos: Vector3; color: number }> // :208 — minimap + 3D source of truth
complete(): void                                      // :221
abort(): void                                         // :235 — restores chase speed, clears active (no hooks, no reward)
serialize(): string                                   // :298 — JSON of profile
deserialize(data: string): void                       // :302 — tolerant parse; corrupt input silently ignored; level recomputed from xp
```

Hooks (`MissionHooks`, `:29-33`): optional `onMissionStart(def)`, `onMissionComplete(def, reward)`, `onObjective(def, text)`.

## Interactions

Callers:
- `ModeController` — E-key zone entry on foot and while driving (`src/systems/ModeController.ts:115-118, 159-163`).
- `Game.update` ticks it (`src/game/Game.ts:425`) and feeds the minimap with `waypoint()` + `markerPositions()` (`:531-532`; rendered in `src/systems/MinimapSystem.ts:24,73-82`).
- `Game.save()/loadSave()` persist the profile (`src/game/Game.ts:574,585`); `SaveManager` stores it as the `profile: string` field (`src/systems/SaveManager.ts:13`).
- `pauseStats()` reads `profile` for the ESC menu line (`src/game/Game.ts:607-608`).
- HUD shows mission name/objective, compass arrow + distance to `waypoint()`, and the level badge (`src/ui/hud.ts:150,153-174`).

Callees:
- `enemies.enemies[targetId]` for assassination completion and waypoint tracking (`src/systems/MissionSystem.ts:147,185`).
- Traffic vehicle pool for chase targets (`getTrafficVehicles`, filtered `!v.occupied && !v.wrecked`, `:100`); the boosted car's `speed` is mutated directly and restored in `complete`/`abort` (`:224-226,236-238`).

## Tuning & Extension Points

Actual constants:

| Constant | Value | Where |
|---|---|---|
| `MISSION_START_DIST` | 4.5 m | `src/data/missions.ts:83` |
| `WAYPOINT_DIST` | 6 m | `src/data/missions.ts:84` |
| XP per level | 100 XP | `xpToLevel`, `src/systems/MissionSystem.ts:36` |
| Chase boost floor | 14 m/s | `startMission`, `:106` |
| Marker colors | green `0x2ecc71` / yellow `0xffd166` | `:212,217` |
| Beam/ring/base geometry | 14 m beam, 1.6 m ring, 2.2 m base | `makeMarker`, `:320-349` |

Extension: new missions need only a `MissionDef` appended to `MISSIONS` (`src/data/missions.ts:27`) — all four types are handled generically; a fifth *type* requires extending the switches in `objectiveText`/`waypoint`/`update`.

## Unresolved

- `abort()` exists (`:235-242`) but has **zero call sites** — there is no way to fail or abandon a mission in-game; combined with `startMission`'s early return (`:91`) a stuck mission soft-locks progression until page reload.
- Assassination `targetId: 3` indexes the shared `EnemySystem.enemies` array; cop insertion/removal by `WantedSystem` can shift which thug the mission points at (see EnemySystem.md → Interactions).
- `startTime` is stored but never used — no time-bonus logic exists despite the race description ("fastest line wins", `src/data/missions.ts:43`).
- A chase mission started when every traffic car is occupied/wrecked instantly completes and pays full reward ("consolation", `:190-192`).
- Missions keep running while paused? No — `update` is skipped with the rest of the loop (`src/game/Game.ts:380`), but the chase timer also freezes while the player drives away, since accumulation is proximity-gated rather than penalized.
