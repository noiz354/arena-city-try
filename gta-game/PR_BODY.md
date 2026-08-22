## Summary

Post-merge improvement pass: applies the full **`majidmanzarpour/threejs-game-skills`**
collection (QA/release, AAA graphics, UI designer, debug/profiler) to the CITY RUSH
game, plus the city-density fix that was the top playability finding.

**7 commits** on `arena/01a027e8-arena-city-try` → `main`.

## What's in this PR

### 🏙️ City density (playability fix)
- `CityGenerator.ts`: ROAD_WIDTH 10→8, BLOCK_SIZE 30→36 (footprint ~61%), BLOCK_COUNT
  8→10 (city 310→432 m), **district falloff** (downtown 0.95 / mid 0.85 / edge 0.65)
- `ChunkManager.ts`: LOD rings widened (FULL 3, SIMPLE 4) *after* density
- **Result: 174 → 287 buildings, ~35 visible (target 25–40)** — kota tidak lagi "open plains"
- Details: `PLAYABILITY_FINDINGS.md`

### 🧪 QA / release (`threejs-qa-release`)
- Fixed: debug HUD (FPS/POS/CHUNK + phase title) leaked into production → DEV-gated,
  verified 0 debug strings in prod bundle
- Fixed: `ModeController.respawnTimer` left negative after respawn (stale state)
- Bot playtest extended (24→29): lethal-hit fail/retry path + 120 s mixed-input
  softlock sweep (zero exceptions, finite positions, valid mode)
- Report: `QA_AUDIT_REPORT.md`

### 🎨 AAA graphics (`threejs-aaa-graphics-builder`)
- New `SkySystem`: procedural gradient sky dome (zenith→horizon, dusk glow, sun disc),
  driven by DayNightSystem
- Lighting stack: key sun + HemisphereLight fill + rim light (+ low ambient)
- Third enemy variant **"bruiser"** (scale 1.35×, HP 180, orange band telegraph)
- Contact discs under pickups; renderer diagnostics in dev HUD
- Ledgers + visual scorecard: `GRAPHICS_AUDIT_REPORT.md` (browser-blocked items flagged)

### 🖥️ UI designer (`threejs-game-ui-designer`)
- Replaced generic stat-card with **5 fixed-zone clusters** (survival / progress /
  threats / combat-driving / feedback)
- Wanted stars → pulsing badge; thugs → ☠ badge; cash/level → chips (fixed-width nums)
- Long controls hint moved to pause menu; brand shrunk; safe-area insets on mobile
- Report: `UI_AUDIT_REPORT.md`

### ⚡ Debug / profiler (`threejs-debug-profiler`)
- Measured & fixed per-frame GC churn in `MissionSystem` (markerPositions + waypoint):
  **~960 → ~11 B/frame (−98.8%)** via buffer reuse + cache invalidation
- Weapon fire path zero-alloc (no clone per pellet)
- Report: `PROFILE_AUDIT_REPORT.md`

## Verification

- `npm test` — 43/43 headless unit tests
- `npm run test:play` — 29/29 bot playtest assertions (incl. 120 s softlock sweep)
- `npx tsc --noEmit` clean · `npm run build` OK (~170 kB gzip)
- Dev server `0.0.0.0:7777` → all modules 200

## Notes / risks

- Browser-only verification (console runtime, canvas pixels, FPS/GPU, mobile emulation)
  remains blocked in the sandbox — covered by `tests/visual.spec.ts` (CI) and
  `QA_PLAYTEST_TASK.md` (agent with MCP Chrome DevTools)
- Generator credential probe: TRIPO/GEMINI/ELEVENLABS all `MISSING` → procedural assets
  used with documented blocker evidence
- `.github/workflows/*` intentionally NOT included (session token lacks `workflows`
  permission) — preserved in `gta-game/CI_WORKFLOW.md`, restore via
  `scripts/setup-gh-workflows.sh`
