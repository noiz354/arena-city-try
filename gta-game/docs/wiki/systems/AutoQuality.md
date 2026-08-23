# AutoQuality

## Purpose

AutoQuality is an FPS-based auto-quality scaler (an "Edelweiss Optimizer pattern" per its header, `src/systems/AutoQuality.ts:8-12`): it samples the frame rate every 2 seconds and steps a 3-level quality tier up or down, lowering pixel ratio, disabling shadow maps, and trimming post effects when FPS drops, restoring them once performance is comfortable. Its reason to exist is keeping the game playable on weak devices without any user-facing graphics settings.

## Execution Flow

**Construction** — created once in `Game`'s constructor immediately after PostFX: `new AutoQuality(this.renderer, this.postfx)` (`src/game/Game.ts:150`). It holds only the two references it mutates; level starts at **2** (maximum) (`src/systems/AutoQuality.ts:14`).

**Per-frame calls** — from `Game.update`, after `postfx.update(delta)`:

1. `quality.frame()` — increments the frame counter only (`src/game/Game.ts:455`, `src/systems/AutoQuality.ts:28-30`).
2. `quality.update(dt)` — decrements `timer`; early-returns until it expires. When `timer ≤ 0`, resets `timer = SAMPLE_INTERVAL` (2 s) and computes `fps = frames / SAMPLE_INTERVAL`, then zeroes `frames` (`src/systems/AutoQuality.ts:32-38`). Decision ladder:
   - `fps < QUALITY_DOWN_FPS (28)` and `level > 0` → decrement level, call `apply()` immediately, reset `goodSamples` to 0 (`src/systems/AutoQuality.ts:40-43`)
   - else if `fps > QUALITY_UP_FPS (50)` and `level < 2` → increment `goodSamples`; upgrade only after **2 consecutive good samples**, i.e. ≥ 4 seconds of sustained >50 FPS before stepping up (`src/systems/AutoQuality.ts:44-50`)
   - otherwise → reset `goodSamples` to 0 (mixed/medium FPS is treated as "don't touch") (`src/systems/AutoQuality.ts:51-53`)

Downgrades are instant; upgrades are hysteresis-gated to prevent oscillation around the thresholds.

**On tier change** — private `apply()` performs all three side effects (`src/systems/AutoQuality.ts:56-63`):

1. Pixel ratio by tier: level ≥ 2 → `Math.min(window.devicePixelRatio, 2)`; level 1 → `1`; level 0 → `0.7`
2. `renderer.shadowMap.enabled = level >= 1` (shadows off at minimum tier)
3. `postfx.setQuality(level)` — delegates pass toggling to PostFX (see PostFX.md §Public API)
4. `renderer.setSize(window.innerWidth, window.innerHeight, false)` with `updateStyle=false`, forcing re-render at the new resolution next frame (`src/systems/AutoQuality.ts:61-62`)

Note this loop never runs while paused — `Game.update` is skipped when `paused` is true (`src/game/Game.ts:380`), so sampling pauses with gameplay.

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `level` | `number` (private) | Current quality tier: **2 = max, 1 = medium, 0 = minimum** (`src/systems/AutoQuality.ts:14`) |
| `timer` | `number` (private) | Seconds remaining in the current sample window; initialized to `SAMPLE_INTERVAL` so the first evaluation happens ~2 s after boot (`src/systems/AutoQuality.ts:15`) |
| `frames` | `number` (private) | Frames counted since last sample (`src/systems/AutoQuality.ts:16`) |
| `goodSamples` | `number` (private) | Consecutive samples above the up-threshold; required count is 2 (`src/systems/AutoQuality.ts:17`) |

## Public API

- `constructor(renderer: WebGLRenderer, postfx: PostFX)` — stores both as readonly privates (`src/systems/AutoQuality.ts:19-22`).
- `get qualityLevel(): number` — read-only access to the current tier 0–2 (`src/systems/AutoQuality.ts:24-26`). No internal consumer; useful for HUD/debug/QA.
- `frame(): void` — must be called exactly once per rendered frame to keep FPS math correct (`src/systems/AutoQuality.ts:28-30`).
- `update(dt: number): void` — drives the sample window and tier transitions; `dt` in seconds (`src/systems/AutoQuality.ts:32-54`).
- `apply()` is private — tiers can only change through the sampler.

## Interactions

| Counterparty | Direction | What flows |
|---|---|---|
| `Game` (`src/game/Game.ts:150`) | creates AutoQuality | renderer + postfx references |
| `Game.update` (`src/game/Game.ts:455-456`) | → AutoQuality | `frame()` + `update(delta)` per simulated frame |
| → `PostFX.setQuality` (`src/systems/AutoQuality.ts:60`) | → PostFX | level 0–2; PostFX maps to pass enable/strength flags |
| → `WebGLRenderer` (`src/systems/AutoQuality.ts:58-59,62`) | → renderer | `setPixelRatio`, `shadowMap.enabled`, `setSize(..., false)` |

State exchanged: a single integer (quality level) is the entire contract between AutoQuality, the renderer, and PostFX. Nothing reads `qualityLevel` elsewhere in `src/` (grep across repo confirms only definition site). The initial renderer setup mirrors tier-2 values: `setPixelRatio(Math.min(devicePixelRatio, 2))` and shadows enabled at boot (`src/game/Game.ts:123,125`), so AutoQuality's first downgrade is the only path that ever changes them.

## Tuning & Extension Points

Constants (`src/systems/AutoQuality.ts:4-6`):

| Constant | Value | Meaning |
|---|---|---|
| `SAMPLE_INTERVAL` | `2` s | Sampling window length |
| `QUALITY_UP_FPS` | `50` | FPS above which a sample counts toward upgrading |
| `QUALITY_DOWN_FPS` | `28` | FPS below which an immediate downgrade fires |

Other tunables: consecutive-good-samples requirement **2** (hard-coded, line 46); pixel-ratio table `min(dpr,2) / 1 / 0.7` (line 57); shadow cutoff `level >= 1` (line 59).

Extension points: add a new tier by widening the `level` range in both branches of `update` and adding a case to the ratio expression in `apply`. To make quality user-selectable, set `level` via a setter that also calls `apply()` (the field is currently write-private; the getter already exists for UI display). To react to tier changes (e.g. telemetry or an on-screen notice), hook inside `apply()` — it is the single funnel through which every tier transition passes.

## Unresolved

(none)
