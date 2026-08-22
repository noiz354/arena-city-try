# PLAN — Graphics Upgrade (incremental slices)

Derived from `tasks/spec.md`. Each slice is independently reviewable and must keep
`npm run check` green before the next slice starts. Implementation follows
`incremental-implementation` + `test-driven-development` (write the test/stub that fails,
then implement).

---

## Slice M1 — Sky & aerial perspective  (`threejs-atmosphere-aerial-perspective`)

**Goal:** replace the flat gradient dome with an analytic Rayleigh/Mie sky that shares the
sun direction and adds depth-based aerial perspective (haze).

1. Read `references/atmosphere-system-contract.md` + `examples/lut-aerial-perspective/source/*`
   (note: LUT example needs `.exr`/`.bin` assets → use the **analytic height/distance tier**,
   no precomputed textures).
2. Add `src/systems/AtmosphereSystem.ts`: sky shader (single-scatter approximation: Rayleigh +
   Mie phase, sun disc/halo, horizon glow) with uniforms for `sunDirection`, `sunColor`,
   `exposure`, `hazeColor`, `hazeDensity`.
3. Wire `DayNightSystem` to drive `sunDirection`/`sunColor` (already computes both).
4. Add aerial perspective: replace/augment the fixed `Fog` with a depth-based haze term in the
   final composite or a fog shader hook (analytic transmittance/inscattering toward sun).
5. **Test:** assert the sun direction uniform equals `DayNightSystem` sun direction at several
   times of day; assert sky brightens at noon vs night (pure-logic color lerp checks).

**Exit:** sky horizon glow + haze both follow the day/night sun; `npm run check` green.

## Slice M2 — Stable shadow coverage  (`threejs-shadow-systems`)

**Goal:** shadows stay crisp anywhere in the city (fix the turn-1 note: frustum is fixed and
drifts off the player at the city edge).

1. Read `references/cached-clipmap-shadows.md` (large-world directional light pattern).
2. Minimum viable: keep the single 2048² map but **snap** the frustum center to the shadow
   texel grid and center it on the player each frame (kill shadow swim/pop). Scale `bias` by
   world-space texel width.
3. Stretch (if budget allows): 2 cascade levels (near 55 m full-res, far 260 m) with a
   containment cross-fade.
4. **Test:** pure-logic check that the snapped center equals the player's chunk position for a
   set of sample positions across the map (no drift accumulation).

**Exit:** shadows render at the ±155 m city edges without popping; `npm run check` green.

## Slice M3 — Vegetation  (`threejs-procedural-vegetation`)

**Goal:** trees read as trees; grass underfoot.

1. Read `references/` + `examples/stylized-meadow-grass/*` and the growth-hierarchy tree
   pattern (species table → branch queue → oriented rings → leaf cards).
2. `src/systems/Vegetation.ts`: deterministic tree builder (trunk with tapered rings, 2–3
   branch levels, leaf-card canopy) replacing the `tree` prop mesh in `ChunkManager`.
3. Instanced stylized grass: blades as instanced quads/cross-cards on city-block grass and
   terrain, GPU-culled by chunk LOD (reuse the existing chunk activation).
4. Rooted wind: shared time uniform bends foliage/blades (vertex offset), no rebuild.
5. **Test:** deterministic (same seed → same tree), branch/leaf counts bounded, instancing
   produces 1 draw call per chunk (mirror the existing `InstancedMesh` test).

**Exit:** trees + grass visibly replace primitive shapes; `npm run check` green.

## Slice M4 — Wet surfaces  (`threejs-precipitation-surfaces`)

**Goal:** rain wets the roads.

1. Read `references/precipitation-surface-systems.md` + `examples/wet-puddle-rain/*` (note the
   GPL license boundary — do not copy GPL-derived source verbatim; re-implement the mechanism).
2. `src/systems/WetSurfaceSystem.ts`: a shared `wetness` uniform (driven by existing
   `WeatherSystem.rainAmount`) that lowers ground roughness + adds a procedural puddle mask +
   ripple normals to the ground material when wet.
3. Keep the existing rain `LineSegments`; add ripple normal response only on upward road faces.
4. **Test:** `wetness` follows `rainAmount` with a smooth lerp; ground roughness target drops
   when `wetness > 0` and returns when dry.

**Exit:** rain visibly wets roads and dries out after; `npm run check` green.

## Slice M5 — Image pipeline  (`threejs-bloom` + `exposure-color-grading` + `screen-space-ambient-occlusion` + `image-pipeline`)

**Goal:** measured exposure → tone map → grade → (bloom + GTAO) instead of a single bloom.

1. Read the four `references/*.md`. Coordinate pass ownership with `threejs-image-pipeline`.
2. `src/systems/ExposureGrading.ts`: 64×36 luminance meter (async readback) → adapted exposure
   → single tone-map ownership → generated 32³ LUT grade.
3. `src/systems/GTAO.ts`: half-res horizon sampling, reversed-depth reconstruction, bilateral
   reconstruction; apply to **indirect diffuse only**.
4. Replace `PostFX.ts` `UnrealBloomPass` with an HDR bloom that composites before tone mapping;
   make each effect toggleable and wire into `AutoQuality` tiers.
5. **Test:** exposure/pipeline state transitions are deterministic; toggles don't leak
   (materials restored); `npm run check` green.

**Exit:** final image has a single coherent color path; all effects toggle; quality tiers respected.

---

## Overall exit criteria

- [ ] All 5 slices land in order, each with `npm run check` green.
- [ ] `npm run build` succeeds; bundle growth is reviewed (no accidental asset bloat).
- [ ] No external/CDN assets introduced; all GPU resources disposed.
- [ ] `tasks/todo.md` reflects completed work.
- [ ] Human review performed at each slice boundary (this plan is the gate).
