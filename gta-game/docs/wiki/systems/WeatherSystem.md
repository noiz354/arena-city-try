# WeatherSystem

## Purpose

Implements the clear ↔ rain weather cycle: a timed state machine toggles `raining` every 30–70 s, and a pooled `LineSegments` rain field (500 drops) renders falling streaks that follow the camera (`src/systems/WeatherSystem.ts:7-9`). It also owns fog *distances* — rain tightens fog near/far while leaving fog *color* to DayNightSystem (`src/systems/WeatherSystem.ts:80-82`). Its smooth `rainAmount` envelope is the single shared signal consumed by `WetSurfaceSystem` and by Game for sky tinting (`src/systems/WeatherSystem.ts:13`).

## Execution Flow

**Construction** — `new WeatherSystem(scene, fog)` in Game's constructor with the scene (rain is self-added) and the world `Fog` object (`src/game/Game.ts:166`). The constructor builds a `BufferGeometry` with `RAIN_COUNT·6` floats (2 vertices per drop = 1 line segment), initializes all 500 drops via `resetDrop(i, 0)`, attaches a `Float32BufferAttribute('position', 3)`, wraps it in a transparent `LineBasicMaterial` (color `0x9fb4c8`, opacity 0.55, `depthWrite: false`), sets `frustumCulled = false`, starts `visible = false`, and adds itself to the scene (`src/systems/WeatherSystem.ts:24-37`).

**Per frame** — `update(dt, cameraPos)` called from `Game.update` after day/night (`src/game/Game.ts:446`):

1. **State machine**: decrement `timer`; on expiry flip `raining = !raining` and re-arm `timer = 30 + Math.random() * 40` seconds (`src/systems/WeatherSystem.ts:55-59`). First change fires after the initial `timer = 30` (`src/systems/WeatherSystem.ts:15`) — so the game always *starts clear*.
2. **Envelope**: `rainAmount = MathUtils.damp(rainAmount, raining ? 1 : 0, 0.8, dt)` — exponential smoothing toward the target with damping λ = 0.8 (`src/systems/WeatherSystem.ts:60`).
3. **Visibility gate**: rain object hidden until `amount > 0.02` (`src/systems/WeatherSystem.ts:62-63`).
4. **Rain simulation** (only while visible): the whole `LineSegments` repositions to `(cameraPos.x, 0, cameraPos.z)` so the field follows the player; both Y components of every drop fall at 60 units/s (`arr[idx+1] -= 60*dt` and `arr[idx+4] -= 60*dt`); when the lower vertex drops below `-45` the drop respawns via `resetDrop(i, 0)` around local origin; finally `attr.needsUpdate = true` and material opacity becomes `0.55 * amount` (`src/systems/WeatherSystem.ts:65-78`).
5. **Fog tightening**: `fog.near = lerp(90, 45, amount)`, `fog.far = lerp(420, 170, amount)` (`src/systems/WeatherSystem.ts:81-82`).

Note there is no thunder/lightning/snow — only the binary clear/rain state plus its smoothed envelope.

## Data Structures

| Field | Type | Meaning |
|---|---|---|
| `raining` | `boolean` | Current discrete weather state; flips on timer expiry (`src/systems/WeatherSystem.ts:12`). |
| `rainAmount` | `number` | Public smoothed 0..1 rain intensity; read by WetSurfaceSystem (via closure) and documented as "read by Game to tint sky slightly" (`src/systems/WeatherSystem.ts:13-14`). |
| `timer` | `private number` | Seconds until next state flip; init 30, re-armed to `30 + rand·40` (`src/systems/WeatherSystem.ts:15,58`). |
| `rain` | `private readonly LineSegments` | The pooled rain field mesh (`src/systems/WeatherSystem.ts:16`). |
| `positions` | `private readonly Float32Array` | Backing array of 3000 floats (500 segments × 6 coords) (`src/systems/WeatherSystem.ts:17,25`). |
| `baseColors` | `private readonly Color` | Drop color `0x9fb4c8` (`src/systems/WeatherSystem.ts:18`). |

Constants: `RAIN_COUNT = 500`, `RAIN_SPREAD = 45` (half-extent multiplier — drops span ±45 m in x/z), `RAIN_LENGTH = 0.35` (streak length in +Y) (`src/systems/WeatherSystem.ts:3-5`).

Drop geometry from `resetDrop`: head at random `(±45, baseY + rand·90 − 45, ±45)`; tail offset by `(rand−0.5)·0.08, +RAIN_LENGTH, (rand−0.5)·0.08` giving streaks slight jitter (`src/systems/WeatherSystem.ts:40-51`).

## Public API

| Member | Signature | Behavior |
|---|---|---|
| `constructor` | `(scene: Scene, fog: { near: number; far: number })` | Fog param is structurally typed `{near, far}` rather than three's `Fog` — any object with those numeric fields works (`src/systems/WeatherSystem.ts:20-23`). |
| `update(dt, cameraPos)` | `(dt: number, cameraPos: Vector3): void` | State machine tick + rain sim + fog distances. `dt` seconds; `cameraPos` centers the rain field (Y ignored, field pinned to y=0). |
| `raining` / `rainAmount` | public fields | Read-only in practice; external code reads them but nothing outside flips `raining`. |

There is no `dispose()` — the geometry/material leak is owned by scene teardown (Game never calls one).

## Interactions

- **Game (owner)** — constructs it (`src/game/Game.ts:166`), ticks it each frame with the camera position (`src/game/Game.ts:446`).
- **WetSurfaceSystem** — consumes `weather.rainAmount` through the closure passed at construction: `new WetSurfaceSystem(world.groundMaterial, () => this.weather.rainAmount)` (`src/game/Game.ts:171`). This closure is THE coupling point between weather state and ground response.
- **World.fog** — shares the same `Fog` instance created in World (`src/game/World.ts:40`); Weather writes near/far (`src/systems/WeatherSystem.ts:81-82`), DayNightSystem writes color (`src/systems/DayNightSystem.ts:93`). Order matters per frame: dayNight runs first (line 393), weather later (line 446), so weather's distance writes land last but neither overwrites the other's channel.
- **Scene graph** — adds/removes visibility of its own rain mesh; no other system references the mesh.

## Tuning & Extension Points

All constants in `src/systems/WeatherSystem.ts`:

- Cycle length: initial delay `timer = 30` s (line 15); subsequent phases `30 + rand·40` → uniform 30–70 s (line 58).
- Envelope damping: λ = 0.8 in `MathUtils.damp(..., 0.8, dt)` (line 60) — raise for snappier onset.
- Rain look/density: `RAIN_COUNT = 500`, `RAIN_SPREAD = 45`, `RAIN_LENGTH = 0.35` (lines 3-5); fall speed hardcoded `60` u/s (lines 72-73); respawn floor `-45` (line 74); base opacity `0.55` scaled by amount (lines 31, 77); visibility threshold `0.02` (line 63).
- Fog squeeze: near `[90 → 45]`, far `[420 → 170]` at full rain (lines 81-82).
- Safe extensions: add new states by replacing the boolean flip at lines 56-58 with an enum index into a phase table (keep writing `rainAmount` so wet-surface coupling survives); add snow as a sibling LineSegments gated on a temperature input — do not touch the fog-color channel (owned by DayNightSystem).

## Unresolved

- The doc comment says `rainAmount` is "read by Game to tint sky slightly" (`src/systems/WeatherSystem.ts:13`), but no such tint exists in current `Game.update` — the only consumer found is WetSurfaceSystem (`src/game/Game.ts:171`). Likely stale comment.
