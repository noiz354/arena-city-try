# CITY RUSH — GTA-Like Open World Game

Three.js + TypeScript open-world game built from the master prompt
(`MASTER_PROMPT.md` at repo root), using the skills in `skills/` and patterns
in `reference/`.

## Status

| Phase | System | Status |
|---|---|---|
| 0 | Project Scaffold | ✅ done — scene, camera, renderer, lights+shadows, 310m city ground, OrbitControls |
| 1 | Player Controller | ✅ done — 3rd-person WASD/inertia, jump, sprint+stamina, wall-avoidance camera |
| 2 | Open World Streaming | ✅ done — 484 chunks (16m), 3-level LOD, procedural city + props |
| 3 | Vehicles & Driving | ✅ done — 24 parked + 10 traffic cars, physics, enter/exit, damage |
| 4 | Combat & Weapons | ✅ done — 4 hitscan weapons, ammo/reload, enemies, pickups, death/respawn |
| 5 | NPCs & Traffic | ✅ done — pedestrians (walk/idle/flee/dialogue), AI traffic, wanted stars + cops |
| 6 | Missions & Progression | ✅ done — delivery/race/assassination/chase, waypoints, minimap, money/XP, save/load |
| 7 | Polish & Performance | ⏳ next — day/night, weather, particles, audio, post-processing, mobile |

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
