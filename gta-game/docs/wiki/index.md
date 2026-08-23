# CITY RUSH — Implementation Wiki

Implementation-detail documentation for the Three.js open-world browser game in this repository (`src/`). Every claim is backed by `file:line` references to the actual source. Generated from source analysis; discrepancies between docs/code/comments are flagged per-page under *Unresolved*.

## Start Here

| Page | Contents |
|------|----------|
| [game-loop](game-loop.md) | Bootstrap order, the exact per-frame update sequence, delta handling, resize, how `Game`/`World` wire every subsystem together |
| [entities](entities.md) | `Player` and `Vehicle` physics constants, damage/death/respawn flow, enter/exit vehicle state machine |
| [utils-and-data](utils-and-data.md) | InputManager bindings, raycast/texel/logger/errors utilities, full data tables (missions, vehicles, weapons), telemetry |

## Systems

### World & Rendering
| Page | Contents |
|------|----------|
| [ChunkManager](systems/ChunkManager.md) | LOD rings (FULL_RADIUS=1/SIMPLE_RADIUS=2 → 5×5 active chunks), lazy build-once model explaining ~1798 geometries |
| [CityGenerator](systems/CityGenerator.md) | Layout constants (CELL=40), mulberry32 seeded RNG per chunk, plot/in-road scatter rules |
| [Vegetation](systems/Vegetation.md) | 24k grass blades in 1 draw call, rejection sampling ring 280–760 m, wind shader |
| [PostFX](systems/PostFX.md) | EffectComposer pass chain, postfx on/off toggle, DPR handling |
| [ColorGrade](systems/ColorGrade.md) | Full-screen color grading pass consumed by PostFX |
| [AutoQuality](systems/AutoQuality.md) | Automatic quality tier adjustment based on frame timing |
| [CameraRig](systems/CameraRig.md) | Follow/orbit camera behavior driven by mode + input |
| [SkySystem](systems/SkySystem.md) | Sky dome; consumes shared sun direction from DayNightSystem |
| [DayNightSystem](systems/DayNightSystem.md) | Time-of-day cycle, sun direction contract with World/Sky, fog color channel |
| [WeatherSystem](systems/WeatherSystem.md) | Weather state machine; owns fog near/far (color comes from DayNight) |
| [WetSurfaceSystem](systems/WetSurfaceSystem.md) | Rain wetness/ripple surfaces; known shared-material quirk flagged |

### Gameplay
| Page | Contents |
|------|----------|
| [ModeController](systems/ModeController.md) | Foot↔vehicle mode state machine, enter/exit transitions |
| [VehicleManager](systems/VehicleManager.md) | Spawned/parked cars, `getNearest` with hard ENTER_DIST²=12.96 (3.6 m) threshold |
| [TrafficSystem](systems/TrafficSystem.md) | AI traffic driving; documented turn-RNG quirk (right turns unreachable) |
| [PedestrianSystem](systems/PedestrianSystem.md) | Pedestrian spawning/walking/fleeing |
| [WantedSystem](systems/WantedSystem.md) | Star math (`reportCrime(severity)` → +severity−1 stars), 14 s/8 s decay, cop spawn cadence 6 s, road-snapped spawn ring 50–80 m |
| [EnemySystem](systems/EnemySystem.md) | Thugs/cops: LOS ray, chase/lose radii 34/55 m, melee damage 8/5 @1.15 s cooldown |
| [MissionSystem](systems/MissionSystem.md) | All 4 missions, zone radius 4.5 m, waypoint 6 m, XP-per-level 100, marker diffing |
| [PickupSystem](systems/PickupSystem.md) | Pickup radius 1.9 m, bob/pop animation, hooks into WeaponSystem |
| [WeaponSystem](systems/WeaponSystem.md) | Hitscan shooting, per-weapon stats, ammo economy (pistol 11/48 cross-check) |
| [WeaponView](systems/WeaponView.md) | First-person weapon hold pose, recoil/bob/muzzle flash constants |
| [ParticleSystem](systems/ParticleSystem.md) | 140-particle pool, explosion recipe (26/14/10), smoke emission |

### UI & Support
| Page | Contents |
|------|----------|
| [MinimapSystem](systems/MinimapSystem.md) | North-up projection, draw order, blip logic fed by MissionSystem |
| [AudioManager](systems/AudioManager.md) | Sound playback/pooling |
| [SaveManager](systems/SaveManager.md) | Persistence keys and save/load paths through Game |
| [MobileControls](systems/MobileControls.md) | Touch controls wiring into InputManager |
| [ColliderDebug](systems/ColliderDebug.md) | F3 / `window.game.colliderDebug.toggle()` overlay, 0.25 s Box3Helper rebuild |

## Runtime Debug Console

The game exposes `window.game` (see [game-loop](game-loop.md)). QA entry points used during E2E testing:

```js
window.game.colliderDebug.toggle()
window.game.wanted.reportCrime(3, {x: 0, z: 0})
window.game.modeCtrl          // mode state machine
window.game.vehicles.getNearest(x, z)
```

## Known Doc-vs-Code Findings

Flagged by source analysis (details on each page):

- `heal()` has zero callers — no HP auto-regen in source despite observed runtime regen ([entities](entities.md))
- Observed walk speed exceeds coded `WALK_SPEED=5.5` cap ([entities](entities.md))
- `reportCrime(3)` from 0★ yields 2★, not ≥3★ ([WantedSystem](systems/WantedSystem.md))
- Traffic turn RNG never picks right turns ([TrafficSystem](systems/TrafficSystem.md))
- WetSurface shared ripple material makes per-ripple opacity writes ineffective ([WetSurfaceSystem](systems/WetSurfaceSystem.md))
- ColorGrade docstring promises S-curve/split-toning the linear contrast code doesn't implement ([ColorGrade](systems/ColorGrade.md))
