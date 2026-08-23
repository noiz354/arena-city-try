# Changelog

All notable changes to **arena-city-try** (GTA-like Three.js browser game), newest first.
Source: [github.com/noiz354/arena-city-try](https://github.com/noiz354/arena-city-try)

> **Note on coverage:** The repository's entire history spans a **single day (2026-08-22)** — 33 commits total (31 substantive, 2 merge commits). Daily vs. weekly grouping therefore collapses into one period; this changelog reflects the full history as it stands. It is short history recorded honestly, not padded.

## 2026-08-22 — Full project history

### Features 🆕

- **Core game build-out (Phases 0–7)** — the complete initial implementation of the game:
  - Phase 0: project scaffold — Three.js r185 + Vite 8 + TypeScript strict ([932537f](https://github.com/noiz354/arena-city-try/commit/932537f))
  - Phase 1: third-person player controller — movement, jump, sprint + stamina, camera rig ([3bfbcf7](https://github.com/noiz354/arena-city-try/commit/3bfbcf7))
  - Phase 2: open-world streaming — procedural city generated in 16m chunks ([466dbb0](https://github.com/noiz354/arena-city-try/commit/466dbb0))
  - Phase 3: vehicles & driving — enterable cars with physics + damage ([6c39f34](https://github.com/noiz354/arena-city-try/commit/6c39f34))
  - Phase 4: combat & weapons — hitscan shooting, enemy AI, pickups ([d994523](https://github.com/noiz354/arena-city-try/commit/d994523))
  - Phase 5: NPCs & traffic — pedestrians, AI cars, wanted system ([2010f31](https://github.com/noiz354/arena-city-try/commit/2010f31))
  - Phase 6: missions & progression — delivery / race / assassination / chase ([4c61f83](https://github.com/noiz354/arena-city-try/commit/4c61f83))
  - Phase 7: polish & performance — day/night cycle, rain, particles, audio, bloom, mobile support ([1651e5f](https://github.com/noiz354/arena-city-try/commit/1651e5f))
- **Roadmap round 3** — weapon viewmodel, pause menu, full save/load, spatial audio ([e1f5e7a](https://github.com/noiz354/arena-city-try/commit/e1f5e7a))
- **Roadmap round 4** — spatial line-of-sight query, engine cleanup, CI additions ([e115204](https://github.com/noiz354/arena-city-try/commit/e115204))
- **Graphics upgrade M1–M5** — SkySystem rework, vegetation, wet-surface system, color grading, PostFX expansion, collider debug view, plus the `threejs-awesome-graphics` skill collection; also fixes the spawn-collider bug ([09763c5](https://github.com/noiz354/arena-city-try/commit/09763c5))
- **SkySystem patch + QA tooling** — applied SkySystem improvements, 8 audit reports, playtest bot, scorecard image ([f04dad8](https://github.com/noiz354/arena-city-try/commit/f04dad8))

### Fixes 🐛

- **Massive bug sweep** — 16 bugs fixed across 12 files: 3 critical + 8 high + 5 medium severity ([3f7f357](https://github.com/noiz354/arena-city-try/commit/3f7f357))
- **Audit remediation** — all P0 bugs, P1 performance issues, and P2 feature gaps from the audit addressed ([86609cd](https://github.com/noiz354/arena-city-try/commit/86609cd))
- **AI traffic is now solid** — player can no longer no-clip through AI-driven cars; collision added via Vehicle/Game/ModeController/TrafficSystem changes plus smoke-test coverage ([80ec95e](https://github.com/noiz354/arena-city-try/commit/80ec95e))
- **Respawn timer state leak** — fixed in ModeController ([eb1b894](https://github.com/noiz354/arena-city-try/commit/eb1b894), merged via [PR #2](https://github.com/noiz354/arena-city-try/pull/2) → [c9ddb8e](https://github.com/noiz354/arena-city-try/commit/c9ddb8e))
- **Center car placement** — corrected during final polish; npm test regression suite added alongside ([50bc2f6](https://github.com/noiz354/arena-city-try/commit/50bc2f6))
- **`publish-gh-pages` deploy script** — stale repo files are now wiped on orphan checkout before publishing ([b661d95](https://github.com/noiz354/arena-city-try/commit/b661d95))

### Refactoring 🔄

- **A-1: ModeController extracted** — first cut of the Game.ts god-object refactor ([7e2a128](https://github.com/noiz354/arena-city-try/commit/7e2a128))
- **A-3: InstancedMesh for the simple LOD ring** — draw-call reduction, with a Playwright visual smoke test to guard rendering ([178722c](https://github.com/noiz354/arena-city-try/commit/178722c))

### Documentation 📝

- **E2E runbook** — chrome_devtools end-to-end testing guide (`tests/E2E_CHROME_DEVTOOLS.md`) ([eb1b894](https://github.com/noiz354/arena-city-try/commit/eb1b894))
- **GTA gameplay feature checklist** — research notes + implementation status for planned features ([ef25ca1](https://github.com/noiz354/arena-city-try/commit/ef25ca1))
- **QA playtest report** — 34/45 score, 5 bugs found, 16 screenshots captured ([94a3d6e](https://github.com/noiz354/arena-city-try/commit/94a3d6e))
- **TODO.md & PROGRESS.md** — task list and project timeline + metrics ([abb0a6c](https://github.com/noiz354/arena-city-try/commit/abb0a6c))
- **AUDIT.md** — full project audit with prioritized improvement roadmap ([e45bc75](https://github.com/noiz354/arena-city-try/commit/e45bc75)), later updated with post-roadmap metrics ([960ce7e](https://github.com/noiz354/arena-city-try/commit/960ce7e))
- **README/AUDIT expansions** — CI/CD, analytics, and error-handling sections ([bf2e8cf](https://github.com/noiz354/arena-city-try/commit/bf2e8cf))

### Config / Tooling 🔧

- **Analytics, error handling, and CI/CD tooling added** ([0fec16c](https://github.com/noiz354/arena-city-try/commit/0fec16c))
- **CI workflow relocated to docs/** — workaround: GitHub App lacks the workflows permission ([a9ce62b](https://github.com/noiz354/arena-city-try/commit/a9ce62b))

### Dependencies / Assets 📦

- **Toolkit bootstrap** — GTA-like game toolkit imported: 12 skills + 93 reference source files drawn from 12 Three.js repositories ([1b8b5a6](https://github.com/noiz354/arena-city-try/commit/1b8b5a6))
- **34 community agent skills downloaded** (4 collections) for Three.js game development ([04b1360](https://github.com/noiz354/arena-city-try/commit/04b1360))

### Breaking ⚠️

- None identified. History is short and linear enough that no commit message or diff signals an API/save-format break; if one exists it was not labeled.
