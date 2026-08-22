# CITY RUSH — GTA-Like Open World Game

Three.js + TypeScript open-world game built from the master prompt
(`MASTER_PROMPT.md` at repo root), using the skills in `skills/` and patterns
in `reference/`.

## Status — all 7 phases complete ✅

| Phase | System | Status |
|---|---|---|
| 0 | Project Scaffold | ✅ Vite 8 + Three.js r185 + TS strict, shadowed lighting, city ground |
| 1 | Player Controller | ✅ 3rd-person WASD/inertia, jump, sprint+stamina, wall-avoidance camera |
| 2 | Open World Streaming | ✅ 484 chunks (16m), 3-level LOD, procedural city + props, center tower |
| 3 | Vehicles & Driving | ✅ 24 parked + 10 traffic cars, physics, enter/exit, damage, wrecked state |
| 4 | Combat & Weapons | ✅ 4 hitscan weapons, ammo/reload, enemy AI, pickups, death/respawn |
| 5 | NPCs & Traffic | ✅ pedestrians (walk/idle/flee/dialogue), AI traffic, wanted stars + cops |
| 6 | Missions & Progression | ✅ delivery/race/assassination/chase, waypoints, minimap, money/XP, save/load |
| 7 | Polish & Performance | ✅ day/night, rain, particles, procedural audio, bloom, shake, auto-quality, mobile |

## Controls

| Input | Action |
|---|---|
| WASD | Move / drive (W=throttle, S=brake/reverse) |
| Mouse drag (LMB) | Look around (orbit camera) |
| LMB click | Shoot (crosshair) |
| 1–4 | Switch weapon |
| R | Reload |
| SHIFT | Sprint (on foot) |
| SPACE | Jump |
| E | Enter/exit vehicle · start mission |
| M | Mute audio |
| WHEEL | Zoom camera |

Mobile: touch joystick + look-drag + FIRE / E / JUMP / RUN buttons.

## Feature tour

- **Open world**: 310×310 m procedural city in 16 m chunks (3 LOD rings), roads
  baked into a single canvas texture, buildings with window textures, trees,
  streetlights, a 72 m center tower.
- **Living city**: pedestrians that walk, idle, panic from gunfire and speak;
  AI traffic that follows the road grid, turns at intersections and can be
  hijacked; parked cars to steal.
- **Combat**: pistol/SMG/shotgun/rifle with data-driven stats, ammo + reload,
  tracers, blood/spark effects, thug enemies with LOS-chase and melee, weapon
  crates + ammo drops.
- **Wanted**: GTA-style stars from gunfire/civilians/cops; police chase and
  despawn when the heat cools.
- **Missions**: 4 data-driven missions (delivery, race, assassination, chase)
  with 3D waypoint markers, minimap radar, compass arrow, money/XP/levels and
  localStorage save/load.
- **Polish**: 3-minute day/night cycle, rain cycles, pooled explosion/smoke
  particles, procedural Web Audio SFX + engine hum, bloom + screen-shake,
  auto-quality (FPS-based), loading screen, mobile controls.

## Run

```bash
npm install
npm run dev        # dev server on 0.0.0.0:5173
npm run build      # type-check + production build
npm test           # headless smoke tests for core systems
```

## Structure

```
src/
  main.ts          # entry point + loading screen + HUD wiring
  game/            # Game shell (loop/state machine), World (env + ground + sun)
  entities/        # Player, Vehicle (procedural bodies)
  systems/         # ChunkManager, CityGenerator, CameraRig, VehicleManager,
                   # TrafficSystem, PedestrianSystem, EnemySystem, WeaponSystem,
                   # PickupSystem, WantedSystem, MissionSystem, MinimapSystem,
                   # AudioManager, DayNightSystem, WeatherSystem,
                   # ParticleSystem, PostFX, AutoQuality, MobileControls
  data/            # vehicles.ts, weapons.ts, missions.ts (data-driven configs)
  ui/              # HUD (CSS bundled inline by Vite — no external resources)
  utils/           # InputManager, raycast helpers
tests/             # smoke.mjs — headless regression tests (npm test)
```
