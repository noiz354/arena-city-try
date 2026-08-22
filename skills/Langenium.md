---
name: langenium-open-world-vehicle-combat
description: Open-world MMORPG with aircraft vehicles, missile/gun combat, NPC AI with vision-based pursuit, scanner-based target locking, and procedural city generation in Three.js
source_repository: OpenStudiosCo/Langenium
source_url: https://github.com/OpenStudiosCo/Langenium
project_status: prototype
last_inspected: 2026-08-22
---

# Langenium: reusable implementation skill

## What this skill enables
- Aircraft vehicle system with throttle, vertical speed, heading, drag, and rotation physics
- Missile weapon system with scanner-based target acquisition, lock-on timers, and vision cone detection
- NPC AI with patrol/pursue state machine using YUKA steering behaviors (FollowPath, Pursuit, Arrive)
- 3rd-person chase camera that follows vehicle rotation with smoothing
- Shared client/server game logic architecture (TypeScript shared modules)
- Procedural scenery generation with CSG boolean operations
- Dynamic GPU-tier detection for performance scaling

## Project classification
- **Type:** prototype (v0.6 Alpha, incomplete MMORPG)
- **Evidence:** README states "open source MMORPG", package.json shows v0.6.0-Alpha, multiplayer via socket.io, many @todo comments in source
- **Suitable reuse cases:** Open world vehicle physics, NPC AI with vision/pursue, missile weapon systems with target locking, 3rd-person camera following vehicles, multiplayer architecture scaffolding
- **Not suitable for:** Ground vehicle driving (only aircraft), FPS shooting (no raycast weapons), terrain collision for ground vehicles

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js r172 + postprocessing (EffectComposer, BloomEffect) |
| Language | TypeScript (game/shared), JavaScript (client) |
| Build tool | esbuild (client), Eleventy (static site) |
| Package manager | npm |
| Physics / networking / state / audio | YUKA (AI steering, entity management), socket.io (multiplayer), custom velocity physics |
| Target platforms | Web browser (desktop primary, touch controls included) |

## Run and build
```bash
# Client
cd client && npm install && npm run dev    # compile + watch + serve

# Server
cd server && npm install && cp .env.example .env && npm run dev
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `game/src/objects/aircraft/base.ts` | Aircraft physics: velocity, throttle, drag, heading, altitude, rotation | **HIGH** - reusable vehicle physics |
| `game/src/objects/aircraft/raven.ts` | Aircraft subclass with stat overrides | **MEDIUM** - vehicle stat templates |
| `game/src/objects/projectiles/missile.ts` | Missile projectile with distance-based hit detection (5m radius) | **HIGH** - reusable homing projectile |
| `game/src/actors/base.ts` | Actor base class: entity + mesh + scanners + weapons composition | **HIGH** - entity-component pattern |
| `game/src/actors/pirate.ts` | NPC AI: patrol path + pursue behavior with vision-based activation | **HIGH** - enemy AI state machine |
| `game/src/actors/cargoShip.ts` | Passive NPC: ArriveBehavior path-following between waypoints | **HIGH** - friendly NPC movement |
| `game/src/systems/scanners.ts` | Target acquisition: vision cone, scan/lock/track state machine with timers | **HIGH** - target locking for weapons |
| `game/src/systems/weapons.ts` | Weapon firing system: cooldown, scanner-driven auto-fire | **HIGH** - automated weapon system |
| `game/src/systems/base.ts` | Base system: last-run timestamp + timeout cooldown | **MEDIUM** - rate-limited system pattern |
| `client/src/app/scenograph/cameras.js` | 3rd-person chase camera with vehicle rotation follow | **HIGH** - camera for vehicle games |
| `client/src/app/scenograph.js` | Scene manager: GPU tier check, renderer setup, animation loop | **HIGH** - scene lifecycle management |

## Core implementation recipe
1. **Vehicle physics** (`game/src/objects/aircraft/base.ts`): BaseAircraft defines airSpeed, verticalSpeed, heading with max velocities. `_changeVelocity()` applies acceleration with exponential drag via easeOutExpo(0.987). `move()` converts heading + airSpeed to X/Z via sin/cos.
2. **Entity composition** (`game/src/actors/base.ts`): BaseActor wraps YUKA.Vehicle entity + Three.js mesh + Scanners + Weapons subsystems. Vehicle type auto-creates YUKA entity with render component sync.
3. **Target locking** (`game/src/systems/scanners.ts`): Uses YUKA.Vision (1500 range, 90° FOV). Targets progress: tracking (visible) → locking (1s scan) → locked (3s scan). Lost targets downgrade after 1-3s.
4. **NPC AI** (`game/src/actors/pirate.ts`): Pirate uses YUKA.FollowPathBehavior for patrol (loop path) and YUKA.PursuitBehavior for chasing. Vision check toggles behaviors.
5. **Missile firing** (`game/src/systems/weapons.ts`): Checks scanner targets, verifies opposing standing (faction), fires missile with cooldown. Missile hit uses 5m distance threshold.
6. **Camera follow** (`client/src/app/scenograph/cameras.js`): Camera tracks vehicle with distance offset based on heading (sin/cos). Rotation syncs with lerp smoothing.

## Key patterns to reuse

### Vision-Based Target State Machine
- **Where:** `game/src/systems/scanners.ts:52-157`
- **How:** Checks entity.vision.visible() each frame. Per-target scanTime/lostTime counters. States: none→tracking(0s)→locking(1s)→locked(3s). Lost targets downgrade after delay.
- **Adaptation:** Replace YUKA.Vision with custom raycasting. Keep timer-based progressive lock-on.

### Patrol/Pursue NPC AI
- **Where:** `game/src/actors/pirate.ts:21-76`
- **How:** YUKA.Path with FollowPathBehavior (patrol) and PursuitBehavior (chase). Vision check toggles active flags.
- **Adaptation:** Replace YUKA behaviors with custom steering. Add more states (flee, investigate, idle).

### Cooldown-Based System Pattern
- **Where:** `game/src/systems/base.ts:1-21`
- **How:** BaseSystem stores last timestamp and timeout delay. Subsystems call ready() to check elapsed time.
- **Adaptation:** Add to any rate-limited system (weapon fire, ability cooldown, scan interval).

## Assets, configuration, and controls
- **Input:** WASD + arrow keys (rotation), touch controls with rotation pad and virtual joystick
- **Controls:** Throttle up/down, move up/down/left/right, shoot (auto-fire when locked)
- **Configuration:** `client/src/app/config.js` — localStorage-persisted settings
- **GPU detection:** detect-gpu library auto-disables effects on low-tier GPUs

## Extension playbook
1. Add ground vehicle: extend BaseAircraft with ground collision, wheel physics, replace air drag with ground friction
2. Add raycast weapons: create RaycastWeapon class using Three.js Raycaster
3. Add NPC factions: extend "standing" system with multiple faction IDs
4. Add open-world chunks: terrain chunk system with distance-based loading/unloading

## Limitations and risks
- Heavy use of global `l` object for cross-module communication
- YUKA dependency is significant — alternative steering requires rewriting all AI
- No ground vehicle physics — only aircraft
- Many @todo: v7 comments indicate planned refactoring

## Verification checklist
- [ ] Client builds without errors
- [ ] Aircraft responds to throttle/rotation controls
- [ ] Pirate NPCs patrol and pursue when player enters vision cone
- [ ] Scanner locks onto targets after ~3 seconds
- [ ] Missiles fire when targets are locked
- [ ] Camera follows player aircraft with smoothing

## Evidence
- `game/src/objects/aircraft/base.ts` — 290 lines, vehicle physics
- `game/src/systems/scanners.ts` — 178 lines, target acquisition state machine
- `game/src/actors/pirate.ts` — 77 lines, vision-based patrol/pursue AI
- `game/src/systems/weapons.ts` — 82 lines, scanner-driven auto-weapon system
- `client/src/app/scenograph/cameras.js` — 158 lines, 3rd-person chase camera
- `game/src/objects/projectiles/missile.ts` — 35 lines, distance-based hit calculation
