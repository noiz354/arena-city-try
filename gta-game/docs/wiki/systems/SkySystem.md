# SkySystem

## Purpose

Renders the sky as a single-scatter atmospheric dome: a `BackSide` sphere whose fragment shader ray-marches a flat exponential atmosphere (Rayleigh + Mie scattering) from a ground-level camera, producing physically-grounded sky radiance, a sun disc + halo, and horizon haze (`src/systems/SkySystem.ts:3-9`). It replaces a flat `scene.background` color and shares ONE sun direction with the directional light and fog — the direction is pushed in by DayNightSystem each frame. Per its own header comment it deliberately uses canonical sea-level coefficients instead of the source skill's LUT tier (which would need `.exr`/`.bin` assets), keeping the system asset-free/sandbox-safe (`src/systems/SkySystem.ts:10-14`).

## Execution Flow

**Construction** — `new SkySystem()` in World's constructor; the mesh is added to `world.root` immediately (`src/game/World.ts:87-88`). The constructor:

1. Initializes the 4 uniforms: `sunDirection = (0.3, 0.8, 0.4).normalize()`, `sunColor = 0xfff4e0`, `intensity = 26`, `exposure = 1.0` (`src/systems/SkySystem.ts:30-35`).
2. Creates geometry: `SphereGeometry(900, 40, 20)` — radius 900 m fits inside the camera far plane of 2000 (`src/systems/SkySystem.ts:37`; camera far at `src/game/Game.ts:133`).
3. Builds the `ShaderMaterial`: `side: BackSide`, `depthWrite: false`, `fog: false` (sky must not be fogged) with vertex shader passing world position via `vWorldPos` varying (`src/systems/SkySystem.ts:38-50`).
4. Mesh config: `name = 'sky'`, `frustumCulled = false` (dome always surrounds camera), `renderOrder = -10` (drawn first) (`src/systems/SkySystem.ts:133-136`).

**Per frame** — SkySystem has **no `update()`**. It is passive; all animation is uniform-poking from outside:
- `DayNightSystem.update` calls `setSunDirection(...)` then writes `uniforms.sunColor.value.copy(sun.color)`, `intensity = lerp(1.2, 26, day)`, `exposure = 1.0` (`src/systems/DayNightSystem.ts:106-110`).

**Fragment shader pipeline** (`src/systems/SkySystem.ts:85-129`):

1. View ray `rd = normalize(vWorldPos - cameraPosition)`; `muSun = dot(rd, sunDirection)` (line 86-87).
2. View march: 16 samples over `T_MAX = 60000` m; per sample accumulate Rayleigh/Mie optical depth with exponential height falloff `exp(-h/H)` clamped to `h ≥ 0`; nested light march of 8 samples toward the sun computes transmittance `tr`; inscatter accumulates `tr · (betaR·dR·rayleighPhase + betaM·dM·henyeyGreenstein)` (lines 90-113).
3. Color = `inscatter * sunColor * intensity` (line 115).
4. Sun disc + halo: airmass `1/max(muSun, 0.04)`, transmittance `exp(-(betaR·H_R + betaM·H_M)·0.35·airmass)` (red at horizon); disc via smoothstep on `cosAng` between `1 − 8·r` and `1 − 0.5·r`; halo = `pow(cosAng,120)·0.06 + pow(cosAng,16)·0.12`; added as `sunColor·sunTr·(disc·1.6 + halo)·intensity` (lines 118-123).
5. Night floor: adds `(0.006, 0.008, 0.02)` scaled by `(1 − clamp(muSun + 0.5))` so the dome never reads fully black (line 126).
6. Output `gl_FragColor = vec4(col * exposure, 1.0)` (line 128).

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `mesh` | `readonly Mesh` | The sky dome; owner (World) adds it to scene graph (`src/systems/SkySystem.ts:17`). |
| `uniforms.sunDirection` | `{ value: Vector3 }` | Unit vector toward the sun ("light travel direction" comment, line 19-20). |
| `uniforms.sunColor` | `{ value: Color }` | Sun radiance color, driven by day/night (line 21-22). |
| `uniforms.intensity` | `{ value: number }` | Overall radiance scale, driven by day/night (line 23-24). |
| `uniforms.exposure` | `{ value: number }` | Extra exposure trim for tuning; pinned to 1.0 by DayNightSystem (line 25-26). |

Shader constants (`src/systems/SkySystem.ts:64-73`): `betaR = (3.8e-6, 13.5e-6, 33.1e-6)` m⁻¹, `betaM = 21.0e-6` m⁻¹, scale heights `H_R = 8000` m / `H_M = 1200` m, Mie anisotropy `g = 0.8`, sun angular radius `0.004675` (~0.268°), `VIEW_SAMPLES = 16`, `LIGHT_SAMPLES = 8`, `T_MAX = 60000`.

Phase functions: `rayleighPhase(c) = 3/(16π)(1+c²)` (lines 75-77); Henyey–Greenstein standard form (lines 79-83).

## Public API

| Member | Signature | Behavior |
|---|---|---|
| `constructor()` | none | Builds geometry/material/mesh; no args — all tuning via uniforms after creation. |
| `setSunDirection(x, y, z)` | `(x: number, y: number, z: number): void` | Sets + normalizes the shared direction; reuses existing Vector3, no allocation (lines 139-142). Called once per frame by DayNightSystem. |
| `dispose()` | `(): void` | Disposes sphere geometry and the ShaderMaterial (`src/systems/SkySystem.ts:144-147`). Called from `World.dispose` (`src/game/World.ts:131`). |
| `mesh`, `uniforms` | readonly fields | `uniforms` is intentionally exposed so DayNightSystem can write radiance/color/exposure directly (`src/systems/DayNightSystem.ts:107-110`). |

## Interactions

- **World** — constructs it, parents `sky.mesh` under `world.root`, disposes it on teardown (`src/game/World.ts:87-88,131`). Because it lives under `world.root`, it inherits any root transform (root has none).
- **DayNightSystem** — sole animator: pushes sun direction + color/intensity/exposure uniforms each frame (`src/systems/DayNightSystem.ts:106-110`); imports the type only (`import type { SkySystem }`, `src/systems/DayNightSystem.ts:10`).
- **Game/Scene** — indirectly visible through rendering only; `scene.background` is still set to `world.skyColor` as a fallback behind the dome (`src/game/Game.ts:144`).
- No other system reads or writes it.

## Tuning & Extension Points

- Dome size/detail: radius 900, segments 40×20 (`src/systems/SkySystem.ts:37`) — raise radius if camera far plane grows beyond ~1800.
- Brightness: `intensity` uniform is overwritten every frame by DayNightSystem's `lerp(1.2, 26, day)` (`src/systems/DayNightSystem.ts:109`) — tune there, not here. `exposure` is likewise pinned to 1.0 (`src/systems/DayNightSystem.ts:110`); repurpose it for QA brightness overrides.
- Atmosphere physics: coefficients/scale heights/g/sun radius at `src/systems/SkySystem.ts:64-69`; sample counts at lines 71-72 (halving VIEW_SAMPLES is the first perf lever on mobile).
- Sun disc size: `sunAngularRadius` (line 69); halo shape: exponents 120/16 and gains 0.06/0.12 (line 122); night floor color (line 126).
- Safe extensions: add uniforms to the object literal at lines 30-35 plus matching GLSL declarations; keep `fog: false` and `renderOrder = -10`. To add stars/clouds, add a second material pass or blend into this shader keyed off an extra uniform rather than a second mesh (the dome already renders first).

## Unresolved

- The header cites a "threejs-atmosphere-aerial-perspective skill" as design provenance (`src/systems/SkySystem.ts:4`); no such file exists in-repo — external reference only.
