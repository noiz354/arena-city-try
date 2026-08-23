# ColorGrade

## Purpose

ColorGrade is a pure-data module that procedurally generates the game's 3D color-grading LUT: a **33³ RGBA8** `Data3DTexture` encoding a subtle scene-referred creative grade — gentle contrast, warm shadow lift intent, applied before tone mapping (`src/systems/ColorGrade.ts:3-9`). Because it is generated CPU-side from a math function (no GL required to build), it is unit-testable and deterministic. It exists so the LUT grade never fights the renderer's ACES tone map: the LUT operates on scene-referred HDR values before `OutputPass` tone maps (`src/systems/ColorGrade.ts:6-8`).

## Execution Flow

There is no class, no state, and no per-frame work. The module runs once at PostFX construction:

1. `PostFX` constructor calls `buildGradeLUT(33)` (`src/systems/PostFX.ts:53`, import at `src/systems/PostFX.ts:8`).
2. `buildGradeLUT(size = 33)` allocates a `Uint8Array(size³ × 4)` and fills it with three nested loops ordered b (outer) → g → r (inner), writing index `i = (b * size * size + g * size + r) * 4` (`src/systems/ColorGrade.ts:11-27`). Each texel channel value `r*step, g*step, b*step` (with `step = 1/(size-1)`) passes through `gradeChannel`, then `clamp255` rounds/clamps to 0–255; alpha is fixed at 255 (`src/systems/ColorGrade.ts:12-24`).
3. A `Data3DTexture(data, size, size, size)` is created with `RGBAFormat`, `UnsignedByteType`, `NearestFilter` for both min and mag filters, `needsUpdate = true`, and returned (`src/systems/ColorGrade.ts:29-35`).

The texture's lifetime ends in `PostFX.dispose()`: `this.lut.lut?.dispose()` (`src/systems/PostFX.ts:121`). It is never rebuilt — day/night mood changes flow through exposure (`src/game/Game.ts:453`) instead of regenerating the LUT.

## Data Structures

No classes or interfaces are exported. The only exported symbol is the factory function; internally:

| Symbol | Type | Meaning |
|---|---|---|
| `buildGradeLUT` | `(size = 33) => Data3DTexture` | Sole export (`src/systems/ColorGrade.ts:10`) |
| `gradeChannel` | `(x: number) => number` | Per-channel transfer function (private, `src/systems/ColorGrade.ts:42-48`) |
| `clamp255` | `(x: number) => number` | Rounds `x*255`, clamps to `[0, 255]` (private, `src/systems/ColorGrade.ts:50-52`) |

The texture itself: dimensions `33×33×33`, RGBA/UnsignedByte, nearest-filtered, alpha constant **255** (`src/systems/ColorGrade.ts:29-34`).

## Public API

```ts
export function buildGradeLUT(size = 33): Data3DTexture
```

- `size` — cube dimension of the LUT (default **33**); memory scales as `size³ × 4` bytes.
- Returns a ready-to-upload `Data3DTexture`; caller owns disposal.
- Behavior note: the per-channel function applies **contrast 1.07 pivoted at 0.5**: `c = x * 1.07 - (1.07 - 1) * 0.5`, clamped to `[0, 1]` (`src/systems/ColorGrade.ts:44-46`). Channels are independent here, so no saturation/hue rotation happens in this module — per its own doc comment, saturation would have to be applied "at the LUT sampling stage", i.e. elsewhere (`src/systems/ColorGrade.ts:39-41`). In practice no saturation op exists anywhere downstream: the LUTPass is configured with intensity 1.0 and no extra shader tweaks (`src/systems/PostFX.ts:53`), so the effective grade in the shipped game is exactly this contrast curve.

## Interactions

- **Consumer:** `PostFX` only. Import (`src/systems/PostFX.ts:8`) and single call site `new LUTPass({ lut: buildGradeLUT(33), intensity: 1.0 })` (`src/systems/PostFX.ts:53`).
- **Disposal:** `PostFX.dispose()` disposes the produced texture via `this.lut.lut?.dispose()` (`src/systems/PostFX.ts:119-122`).
- No flags, events, or shared mutable state cross this boundary — the module hands over an immutable data texture and exits.

## Tuning & Extension Points

- Contrast coefficient **1.07** and pivot **0.5** (`src/systems/ColorGrade.ts:44-45`) — the two numbers defining the entire look. Raise toward ~1.15 for punchier contrast; keep pivot at mid-gray.
- LUT resolution **33** (both default param and call site, `src/systems/ColorGrade.ts:10` and `src/systems/PostFX.ts:53`).
- To extend the grade (saturation, split-tone, warm shadows / cool highlights described in the header comment `src/systems/ColorGrade.ts:5-7`), modify `gradeChannel` for per-channel curves or add a cross-channel pass inside the triple loop (where r/g/b values are simultaneously available at `src/systems/ColorGrade.ts:18-20`). Any change regenerates deterministically on next boot; no asset pipeline involved.

## Unresolved

- The header comment promises "warm shadow lift" and "slightly cool highlights" (`src/systems/ColorGrade.ts:5-7`), but `gradeChannel` implements neither — it is a symmetric per-channel contrast scale. Either the comment describes an earlier revision or the effect was intentionally dropped; source alone cannot tell which.
- The doc comment calls the contrast curve an "S-curve" (`src/systems/ColorGrade.ts:43`), while the implementation is a straight linear pivot, not a spline.
