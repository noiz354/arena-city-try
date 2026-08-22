# SPEC — Graphics Upgrade "Awesome Graphics" Pass

> Spec-driven development (Addy Osmani `agent-skills` workflow: SPECIFY → PLAN → TASKS → IMPLEMENT).
> This document is the **source of truth** for the graphics upgrade. It is gated: no code
> is written until the capability map and plan below are reviewed and approved.

---

## Phase 0 — Scope Check & Capability Map

The request ("use all the graphics skills") bundles several **independently testable visual
capabilities**. Per the workflow we must fix module boundaries and build order *before* any
module spec is written.

### Visual contract (target)

- **Subject:** the existing CITY RUSH open-world city (Three.js r185, WebGL, TS, Vite).
- **Scale / camera:** ~310 m city + surrounding terrain; 3rd-person camera 5–25 m from player,
  FOV 60°, far 2000 m.
- **Motion:** player walks/drives; day/night cycle + rain already run continuously.
- **Budget:** stay ≥ 60 FPS desktop / ≥ 30 FPS mobile via existing `AutoQuality`; keep the
  sandbox rule — **no external/CDN assets, procedural only** (API keys probe MISSING).

### Capability map

| Module | Capability | Skill(s) loaded | Depends on | Ships independently? |
|---|---|---|---|---|
| **M1** | Physically-motivated sky + aerial perspective | `threejs-atmosphere-aerial-perspective` | — | ✅ |
| **M2** | Stable large-world shadow coverage (follows player) | `threejs-shadow-systems` | M1 (shared sun) | ✅ |
| **M3** | Growth-hierarchy trees + stylized grass (wind) | `threejs-procedural-vegetation` | M1 (lighting) | ✅ |
| **M4** | Rain → wet-road response (puddles, ripples, roughness) | `threejs-precipitation-surfaces` | M1, ground mat | ✅ |
| **M5** | Image pipeline: metered exposure, tone map, LUT grade, GTAO, bloom | `threejs-bloom`, `threejs-exposure-color-grading`, `threejs-screen-space-ambient-occlusion`, `threejs-image-pipeline` | M1–M4 (applied last) | ✅ |

### Build order (dependency direction)

```
M1 (sky/atmosphere) ──► M2 (shadows) ──► M3 (vegetation) ──► M4 (wet surfaces) ──► M5 (image pipeline)
```

Rationale (router "Execution order" rule): add lighting/shadows and atmosphere only after
silhouette and material masks read without effects; add image-space systems last.

### Explicitly OUT of scope (routing boundaries)

- **Volumetric clouds** (`threejs-volumetric-clouds`) — the pack's implementation is
  geospatial/WebGPU-shaped with large binary shape/scattering data (`shape.bin`, `scattering.exr`).
  Not a fit for this WebGL city at this size; deferred until the atmosphere tier justifies it.
- **Ocean / water optics** (`threejs-spectral-ocean`, `threejs-water-optics`) — the city is
  landlocked (terrain ring replaced the old water plane). No water body to upgrade.
- **Space effects, planets, POM, diffraction/diamond** — no subject in this game.

---

## Phase 1 — Specify

### 1. Objective

Make the CITY RUSH world read as a **cohesive, lit, grounded environment** instead of a
flat-shaded prototype, by replacing the hand-rolled one-offs with the mechanisms taught by the
`threejs-awesome-graphics` pack — while keeping every change procedural (no external assets)
and keeping the build/tests green at each slice.

- **Who:** the player exploring the city on foot and in vehicles.
- **What success looks like:** sky shows horizon glow + aerial haze tied to the same sun that
  casts shadows; shadows stay crisp wherever the player goes; trees read as trees (branches +
  leaf clusters) with grass underfoot; rain visibly wets the roads; and the final image has a
  measured exposure/grading path instead of a single uncalibrated bloom.

### 2. Commands (executable)

```bash
cd gta-game
npm install                      # re-install (node_modules not persisted)
npm run typecheck                # tsc --noEmit
npm test                         # tsx tests/smoke.mjs (headless logic tests)
npm run build                    # tsc && vite build (must stay green)
npm run dev                      # vite --host 0.0.0.0 (live preview)
npm run check                    # typecheck + smoke test, the per-slice gate
```

### 3. Project structure

- `src/game/World.ts` — owns scene-level visuals: sky, terrain, ground, lights, fog.
- `src/systems/SkySystem.ts` — current gradient dome shader (M1 replaces/upgrades this).
- `src/systems/DayNightSystem.ts` — drives sun/sky/fog/light uniforms (M1–M2 consume this).
- `src/systems/WeatherSystem.ts` — rain state machine (M4 consumes `rainAmount`).
- `src/systems/ChunkManager.ts` + `CityGenerator.ts` — buildings + props incl. trees (M3).
- `src/systems/PostFX.ts` — EffectComposer + UnrealBloomPass (M5 replaces this).
- `tests/smoke.mjs` — headless logic tests (extend per slice, no DOM needed where possible).

### 4. Code style

Follow the existing conventions: TypeScript `strict`, no unused locals/params, JSDoc block on
every class, disposables tracked for GPU resource cleanup, scratch `Vector3`/`Color` fields
reused (no per-frame allocation), seeded/deterministic generation, sandbox-safe (canvas/procedural
textures only). One real snippet showing the style:

```ts
/** A single shared scratch color, reused every frame to avoid allocation. */
private readonly tmp = new Color()

update(dt: number): void {
  this.tmp.copy(SKY_DAY).lerp(SKY_NIGHT, 1 - this.dayAmount)
  this.uniforms.horizonColor.value.copy(this.tmp)
}
```

### 5. Boundaries (Always / Ask first / Never)

- **Always:** keep `npm run check` green per slice; dispose GPU resources; stay procedural;
  reuse the existing day/night + weather envelopes rather than adding competing time sources.
- **Ask first:** any new shader/material that changes the whole-scene look; any change to
  collision or gameplay (this pass is visual-only); bundling a new runtime dependency.
- **Never:** external/CDN assets or network fetches; WebGPU-only paths (renderer is WebGL);
  editing the git history or switching branches.

### 6. Success criteria (per module, testable)

- **M1:** sky shader shares the exact sun direction with `DayNightSystem`; aerial haze is
  depth-based and reads at the fog far plane; night sky darkens coherently.
- **M2:** shadow frustum stays centered/snapped on the player at any position in the city
  (no shadow pop at the ±155 m edges); normal bias scales with texel size.
- **M3:** trees are branch/leaf hierarchies (not cylinders); grass is instanced and culled;
  wind deforms foliage without per-frame geometry rebuild; deterministic per chunk.
- **M4:** `rainAmount > 0` drives a wetness mask + puddle ripples + roughness response on the
  ground; clears when rain stops; no per-drop allocations.
- **M5:** exposure is metered from HDR luminance; tone mapping owned in one place; LUT grade +
  bloom + GTAO each toggleable; GTAO modulates indirect only (not emissive/direct).
