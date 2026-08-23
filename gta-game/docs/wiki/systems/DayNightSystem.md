# DayNightSystem

## Purpose

Drives the full day/night cycle: it advances a normalized `timeOfDay` clock, computes the sun's direction (azimuth orbit + elevation), and derives all sun/sky/fog/light colors and intensities from that one direction (`src/systems/DayNightSystem.ts:20-28`). Its key architectural decision is that it does **not** position the `DirectionalLight` — `World.updateSun` places the light + shadow frustum around the player using the exported `sunDirection`, so shadows follow the player instead of orbiting the origin (`src/systems/DayNightSystem.ts:24-27`). It also feeds the same sun direction and radiance into the single-scatter sky shader (`SkySystem`), so sky, fog, and the directional light always agree.

## Execution Flow

**Construction** — created once in `Game`'s constructor with 7 injected dependencies: the world's key `DirectionalLight` sun, the scene `AmbientLight` (found by scanning `world.root.children`), the `HemisphereLight`, a dedicated moon `DirectionalLight` (created in Game at color `0x8fa8ff`, intensity 0.3, position `(-80, 60, -40)` — `src/game/Game.ts:153-155`), the scene background `Color`, the `Fog`, and the `SkySystem` (`src/game/Game.ts:157-165`). The constructor body is empty; all state comes from field initializers (`src/systems/DayNightSystem.ts:44-52`).

**Per frame** — updated exactly once per tick from `Game.update`, deliberately *before* `World.updateSun`, because the light placement consumes the freshly computed `sunDirection` (`src/game/Game.ts:391-394`). The update sequence in `DayNightSystem.update(dt)`:

1. Advance time: `timeOfDay = (timeOfDay + dt / DAY_LENGTH) % 1` where `DAY_LENGTH = 180` s, i.e. a full day passes in 3 real minutes (`src/systems/DayNightSystem.ts:12,64`).
2. Sun elevation: `elevation = sin((t - 0.25) · π · 2)` — peaks at `t=0.5` (noon), crosses zero at dawn/dusk (`t=0.25/0.75`), minimum `-1` at midnight. Clamped to `sunY = clamp(elevation, -0.35, 1)` so the sun never sinks far below the horizon plane (`src/systems/DayNightSystem.ts:68-69`).
3. Direction vector: `(cos((t-0.5)·2π), sunY, sin((t-0.5)·2π))`, then `.normalize()` — azimuth orbits the city while elevation tilts (`src/systems/DayNightSystem.ts:72-78`).
4. Daylight factor: `day = smoothstep(clamp(elevation, -0.15, 0.4), -0.15, 0.4)` stored on the public `day` field; dusk glow factor `dusk = max(0, 1 - |elevation|·5)` is nonzero only near horizon crossings (`src/systems/DayNightSystem.ts:81-83`).
5. Background fallback color: `SKY_DAY → lerp(SKY_NIGHT, 1-day) → lerp(SKY_DUSK, dusk·(1-day)·0.7)` copied into `skyColor` (only visible if the sky mesh were hidden) (`src/systems/DayNightSystem.ts:86-88`).
6. Fog color: same recipe but with `FOG_DAY/FOG_NIGHT` base and dusk lerp factor `dusk·(1-day)·0.5` (`src/systems/DayNightSystem.ts:91-93`).
7. Lights:
   - `sun.intensity = lerp(0.15, 2.6, day)`; `sun.color = sunDay(0xfff4e0)` lerped toward `duskTint(0xff9a5a)` by `dusk·0.6` (`src/systems/DayNightSystem.ts:96-97`)
   - `hemi.intensity = lerp(0.12, 0.5, day)`, `ambient.intensity = lerp(0.12, 0.45, day)` (`src/systems/DayNightSystem.ts:99-100`)
   - `moon.intensity = lerp(0.35, 0.02, day)` — bright at night, nearly off at noon (`src/systems/DayNightSystem.ts:103`)
8. Sky handoff: `sky.setSunDirection(x, y, z)`, copies `sun.color` into `sky.uniforms.sunColor.value`, sets `sky.uniforms.intensity = lerp(1.2, 26, day)` and pins `exposure = 1.0` (`src/systems/DayNightSystem.ts:106-110`).

Note: fog **near/far distances are not touched here** — `WeatherSystem` owns those (see WeatherSystem.md); this system only owns the fog *color* (`src/systems/WeatherSystem.ts:80-82` comment "colors stay owned by day/night system").

## Data Structures

| Field | Type | Meaning |
|---|---|---|
| `timeOfDay` | `number` | Public mutable. 0 = midnight, 0.25 = dawn, 0.5 = noon, 0.75 = dusk (`src/systems/DayNightSystem.ts:30-31`). Default `0.55`. This public field IS the "time of day setting" consumed externally (Visual QA drives it at 0.0 / 0.5 / 0.75). |
| `sunDirection` | `readonly Vector3` | Unit vector toward the sun, recomputed each frame; shared with World shadow placement and SkySystem uniforms (`src/systems/DayNightSystem.ts:33-34`). Initial value `(0.3, 0.8, 0.4).normalize()`. |
| `day` | `number` | Smoothed daylight amount 0..1, exposed for other systems (PostFX exposure uses it — `src/game/Game.ts:453`) (`src/systems/DayNightSystem.ts:36-37`). |
| `tmpSky`, `tmpFog`, `duskTint`, `sunDay` | `private readonly Color` | Scratch/reusable colors; no per-frame allocation (`src/systems/DayNightSystem.ts:39-42`). |

Module-level constants: `DAY_LENGTH = 180`; palette `SKY_DAY = 0x87ceeb`, `SKY_DUSK = 0xff9a5a`, `SKY_NIGHT = 0x0b1026`, `FOG_DAY = 0xbfd4e4`, `FOG_NIGHT = 0x0d1330` (`src/systems/DayNightSystem.ts:12-18`).

## Public API

| Member | Signature | Behavior |
|---|---|---|
| `isNight` | `get isNight(): boolean` | True when `hour() < 6 \|\| hour() > 19` — i.e. night spans 19:00–06:00 game-time (`src/systems/DayNightSystem.ts:54-57`). |
| `hour()` | `hour(): number` | `timeOfDay * 24` as fractional hours (`src/systems/DayNightSystem.ts:59-61`). |
| `update(dt)` | `update(dt: number): void` | Full cycle described above; `dt` in seconds. |
| `timeOfDay` | field | Writable at runtime to scrub time (used for deterministic QA screenshots). |
| `sunDirection`, `day` | readonly fields | Read by `Game`/`World`/`PostFX` each frame. |

## Interactions

- **Game (owner/orchestrator)** — constructs it with world lights/fog/sky (`src/game/Game.ts:157-165`), calls `dayNight.update(delta)` before `world.updateSun(...)` (`src/game/Game.ts:393-394`), and reads `dayNight.day` for tone-map exposure: `postfx.setExposure(0.55 + dayNight.day * 0.6)` (`src/game/Game.ts:453`).
- **World** — receives `dayNight.sunDirection` in `World.updateSun(playerX, playerZ, sunDir)` which positions the shadow-casting sun light around the player with texel-snapped frustum (`src/game/World.ts:101-118`).
- **SkySystem** — written-to every frame via `setSunDirection` + uniform pokes (`src/systems/DayNightSystem.ts:106-110`); imported type-only to avoid a runtime cycle (`src/systems/DayNightSystem.ts:10`).
- **WeatherSystem** — sibling, not caller/callee: weather owns fog near/far, day/night owns fog color; both write into the same `Fog` object (`src/systems/WeatherSystem.ts:81-82`, `src/systems/DayNightSystem.ts:93`).
- **Moon light** — created in Game, intensity driven here (`src/game/Game.ts:153-155`, `src/systems/DayNightSystem.ts:103`).

## Tuning & Extension Points

All values live in `src/systems/DayNightSystem.ts`:

- Day length: `DAY_LENGTH = 180` s (line 12). Raise for realism.
- Time anchors: `timeOfDay` 0/0.25/0.5/0.75 = midnight/dawn/noon/dusk (line 30); elevation formula peaks at noon, `sunY` clamped to `[-0.35, 1]` (lines 68-69).
- Transition windows: daylight smoothstep band `[-0.15, 0.4]` elevation (line 81); dusk glow dies out by `|elevation| ≥ 0.2` (`1 - |elevation|·5`, line 82).
- Intensity ranges: sun `[0.15, 2.6]`, hemi `[0.12, 0.5]`, ambient `[0.12, 0.45]`, moon `[0.35, 0.02]` (lines 96-103).
- Sky radiance range: `[1.2, 26]` by `day` (line 109).
- Palette hexes at lines 14-18 plus `duskTint 0xff9a5a`, `sunDay 0xfff4e0` (lines 41-42).
- Safe extensions: add new derived channels inside `update()` after line 81 (where `day`/`dusk` exist); to change what follows the sun, pass another consumer and poke it next to lines 106-110. Do not add light-positioning here — keep that contract with `World.updateSun`.

## Unresolved

(none)
