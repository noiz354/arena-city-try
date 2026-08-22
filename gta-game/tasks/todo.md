# Task list — Graphics Upgrade

Status legend: `[ ]` todo · `[x]` done · `[~]` in progress

## Phase 0–2 (current)

- [x] Approve capability map (`tasks/spec.md` §Phase 0)
- [x] Approve plan + build order (`tasks/plan.md`) — **scope = M1+M2+M3**

## Slices

- [x] M1 — Sky & aerial perspective (single-scatter sky + sun-aware fog)
- [x] M2 — Stable shadow coverage (texel-snapped player-following frustum + bias scaling)
- [x] M3 — Vegetation (growth-hierarchy trees + instanced wind grass)
- [x] M4 — Wet surfaces (rain → wet roads: shared envelope, roughness response, puddles, ripples)
- [x] M5 — Image pipeline (exposure knob / tone map / LUT grade / bloom / GTAO)

## Review

- [x] Per-slice `npm run check` green (58 tests) + `npm run build` OK (181 kB gzip)
- [x] Bundle-size reviewed (no asset bloat; procedural only)
- [ ] Visual verification in-browser (BLOCKED: sandbox has no browser — needs the user's preview)
- [ ] Full adaptive luminance meter (deferred: needs browser verification; exposure is a scene-light-model knob)
