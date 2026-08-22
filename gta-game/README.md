# CITY RUSH — GTA-Like Open World Game

Three.js + TypeScript open-world game built from the master prompt
(`MASTER_PROMPT.md` at repo root), using the skills in `skills/` and patterns
in `reference/`.

## Status

| Phase | System | Status |
|---|---|---|
| 0 | Project Scaffold | ✅ done — scene, camera, renderer, lights+shadows, 100x100 ground, OrbitControls |
| 1 | Player Controller | ⏳ next |
| 2 | Open World Streaming | ⬜ |
| 3 | Vehicles & Driving | ⬜ |
| 4 | Combat & Weapons | ⬜ |
| 5 | NPCs & Traffic | ⬜ |
| 6 | Missions & Progression | ⬜ |
| 7 | Polish & Performance | ⬜ |

## Run

```bash
npm install
npm run dev        # dev server on 0.0.0.0:5173
npm run build      # type-check + production build
```

## Structure

```
src/
  main.ts          # entry point
  game/            # Game shell (loop), World (env + ground + placeholders)
  systems/         # (future) physics, AI, weapons, streaming
  entities/        # (future) Player, Vehicle, NPC
  ui/              # HUD, overlays (CSS bundled inline by Vite)
  utils/           # (future) helpers
```
