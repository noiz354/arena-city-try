# PostFX

## Purpose

PostFX owns the entire render pipeline output stage for CITY RUSH: an ordered, single-owner HDR post-processing chain built on three.js `EffectComposer`, running in linear HDR (the composer's default HalfFloat target) (`src/systems/PostFX.ts:10-25`). It encapsulates the pass chain RenderPass → GTAO → bloom → LUT grade → OutputPass tone-map/sRGB, plus a decaying screen-shake system applied directly to the camera before render. It also exposes the single exposure knob (`renderer.toneMappingExposure`) used by the day/night system, and a quality-tier API consumed by `AutoQuality`.

## Execution Flow

**Construction** — `new PostFX(renderer, scene, camera)` is created once inside `Game`'s constructor (`src/game/Game.ts:149`), after the renderer has been configured with ACESFilmic tone mapping and initial exposure 1.1 (`src/game/Game.ts:127-128`). The constructor builds the chain top-to-bottom (`src/systems/PostFX.ts:40-57`):

1. `EffectComposer(renderer)` + `RenderPass(scene, camera)` (`src/systems/PostFX.ts:40-41`)
2. `GTAOPass(scene, camera, 1, 1)` with `output = GTAOPass.OUTPUT.Default`; internally half-res ambient occlusion that modulates indirect light only (visibility blend, not a dark multiply over emissive/direct) (`src/systems/PostFX.ts:44-46`)
3. `UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 0.82)` — strength 0.55, radius 0.5, threshold 0.82, composited pre-tone-map (`src/systems/PostFX.ts:49`)
4. `LUTPass({ lut: buildGradeLUT(33), intensity: 1.0 })` — scene-referred creative grade placed BEFORE tone mapping (`src/systems/PostFX.ts:53`)
5. `OutputPass()` — the single owner of tone mapping (renderer's ACESFilmic) + sRGB conversion (`src/systems/PostFX.ts:57`)

Finally the constructor immediately sizes all passes from `renderer.getSize()` to avoid persisting a stale 1×1-pass state until the first window resize (`src/systems/PostFX.ts:61-62`).

**Per-frame sequence** (driven from `Game.update`, order matters):

1. Exposure is set from the day/night daylight model: `postfx.setExposure(0.55 + dayNight.day * 0.6)` (`src/game/Game.ts:453`)
2. `postfx.update(delta)` decays the shake accumulator and regenerates the random shake offset (`src/game/Game.ts:454`, `src/systems/PostFX.ts:75-86`)
3. After all game systems run, `postfx.applyShake(camera)` adds the offset to `camera.position` (`src/game/Game.ts:460`)
4. Rendering branches on `enabled`: if true → `composer.render()` (full chain); if false → raw `renderer.render(scene, camera)` bypassing all passes (`src/game/Game.ts:461-465`)
5. `postfx.restoreShake(camera)` subtracts the offset, restoring the camera position (`src/game/Game.ts:466`)
6. On window resize, `Game.resize` calls `postfx.setSize(width, height)` which forwards to `composer.setSize`, `bloom.setSize`, `gtao.setSize` (`src/game/Game.ts:619-628`, `src/systems/PostFX.ts:65-69`)

Because `EffectComposer` wraps the whole frame into one draw when `renderer.info.autoReset` is true, `renderer.info.render.calls` reads as 1 per composer render (documented runtime/QA observation; see `tests/E2E_CHROME_DEVTOOLS.md:241`).

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `composer` | `EffectComposer` (readonly) | The pass chain; publicly readable so `Game` can call `composer.render()` (`src/systems/PostFX.ts:27`) |
| `bloom` | `UnrealBloomPass` (private readonly) | HDR bloom pass (`src/systems/PostFX.ts:28`) |
| `gtao` | `GTAOPass` (private readonly) | Ambient occlusion pass (`src/systems/PostFX.ts:29`) |
| `lut` | `LUTPass` (private readonly) | Color-grade LUT pass (`src/systems/PostFX.ts:30`) |
| `shakeOffset` | `Vector3` (private readonly) | Randomized per-frame camera displacement derived from `shake` (`src/systems/PostFX.ts:31`) |
| `shake` | `number` (private) | Accumulated shake energy, hard-capped at 1.2 (`src/systems/PostFX.ts:32`) |
| `enabled` | `boolean` (public, default `true`) | Master toggle; false routes rendering through plain `renderer.render` (`src/systems/PostFX.ts:33`, `src/game/Game.ts:461-465`). Used as the QA on/off toggle |

## Public API

- `constructor(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera)` — builds the 5-pass chain and sizes it immediately (`src/systems/PostFX.ts:35-63`).
- `setSize(w: number, h: number): void` — resizes composer, bloom, and GTAO targets (`src/systems/PostFX.ts:65-69`). Called from `Game.resize` (`src/game/Game.ts:627`).
- `addShake(intensity: number): void` — accumulates shake energy, clamped at **1.2**: `this.shake = Math.min(this.shake + intensity, 1.2)` (`src/systems/PostFX.ts:71-73`).
- `update(dt: number): void` — decays shake at rate **dt × 2.2**; while `shake > 0.005` generates a random offset of `(rand−0.5) × shake × 0.35` on x/y and `× 0.2` on z, otherwise zeroes it (`src/systems/PostFX.ts:75-86`).
- `setExposure(value: number): void` — writes `renderer.toneMappingExposure`; the single exposure knob, driven by the day/night scene-light model (`src/systems/PostFX.ts:93-95`).
- `applyShake(camera: PerspectiveCamera): void` / `restoreShake(camera: PerspectiveCamera): void` — add/subtract `shakeOffset` from `camera.position`; must bracket the render call (`src/systems/PostFX.ts:98-104`).
- `setQuality(level: number): void` — FPS-tier mapping (called by AutoQuality):
  - `gtao.enabled = level >= 2` (GTAO only at max tier — most expensive effect)
  - `bloom.enabled = level >= 1`
  - `bloom.strength = 0.55` at level ≥ 2, else `0.3`
  - `lut.enabled` always `true` while post is enabled (LUT is cheap)
  - `this.enabled = level >= 1` (level 0 disables the whole chain)
  (`src/systems/PostFX.ts:111-117`)
- `dispose(): void` — disposes the composer and the generated LUT texture (`src/systems/PostFX.ts:119-122`).

## Interactions

| Counterparty | Direction | What flows |
|---|---|---|
| `Game` (`src/game/Game.ts:149`) | creates PostFX | renderer/scene/camera |
| `Game.update` (`src/game/Game.ts:453`) | → PostFX | exposure = `0.55 + dayNight.day * 0.6` (daylight amount from `DayNightSystem.day`, `src/systems/DayNightSystem.ts:37`) |
| `Game.update` (`src/game/Game.ts:454-466`) | → PostFX | `update(delta)`, `applyShake`, render branch on `enabled`, `restoreShake` |
| `Game.resize` (`src/game/Game.ts:627`) | → PostFX | width/height |
| `AutoQuality` (`src/systems/AutoQuality.ts:60`) | → PostFX | quality level 0–2 via `setQuality` |
| Vehicle wrecks (`src/game/Game.ts:476`) | → PostFX | `addShake(0.9)` on first-explosion of a wrecked vehicle |
| Car-vs-pedestrian hits (`src/game/Game.ts:514`) | → PostFX | `addShake(0.5)` killed / `addShake(0.2)` knocked down |
| Traffic hits player (`src/game/Game.ts:562`) | → PostFX | `addShake(0.4)` |
| Enemy melee (`src/systems/ModeController.ts:109`) | → PostFX | `addShake(0.3)` |
| `ColorGrade` (`src/systems/PostFX.ts:8,53`) | ← PostFX | imports `buildGradeLUT(33)` to feed the LUTPass |
| Debug console (`src/main.ts:78`) | → PostFX | `window.game.postfx` reachable for QA toggle of `enabled` / manual `setQuality` |

State exchanged: numeric quality level (AutoQuality → PostFX → pass enable flags); float daylight amount (DayNightSystem → Game → `toneMappingExposure`); shake impulses fired by combat/explosion events.

## Tuning & Extension Points

Constants and magic values found in code (`src/systems/PostFX.ts` unless noted):

- Bloom: strength **0.55**, radius **0.5**, threshold **0.82** (line 49); reduced-tier strength **0.3** (line 114)
- LUT: resolution **33³**, intensity **1.0** (line 53)
- Shake cap **1.2** (line 72); decay rate **2.2/s** (line 76); zero-threshold **0.005** (line 77); axis multipliers **0.35 / 0.35 / 0.2** (lines 79–81)
- Quality tiers: GTAO ≥ 2, bloom ≥ 1, LUT always, chain disabled below 1 (lines 111–117)
- Exposure formula `0.55 + day * 0.6` lives in `Game.update` (`src/game/Game.ts:453`), initial exposure **1.1** (`src/game/Game.ts:128`)

Extension points: insert additional passes between the existing ones in the constructor (keep OutputPass last — it must remain the sole tone-mapper, per the header comment `src/systems/PostFX.ts:18-21`); add per-effect toggles alongside `gtao.enabled`/`bloom.enabled` in `setQuality` and mirror them in `AutoQuality.apply`. To add a new shake source, call `addShake` with an impulse in the observed 0.2–0.9 range.

## Unresolved

- The header comment says GTAO runs "half-res internally" (`src/systems/PostFX.ts:43`) but the pass is constructed with `(scene, camera, 1, 1)` and resized full-frame in `setSize`; the half-res behavior is inside `GTAOPass` itself, not visible from this file.
- `GTAOPass` receives no AO parameter tuning (radius/intensity/clamp are defaults); whether defaults were validated visually is not recorded in source.
