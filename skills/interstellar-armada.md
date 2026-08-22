---
name: interstellar-armada-weapon-mission-physics
description: Newtonian space combat with projectile weapons, missile homing, mission scripting, AI pilots, and WebRTC multiplayer
source_repository: nkrisztian89/interstellar-armada
source_url: https://github.com/nkrisztian89/interstellar-armada
project_status: complete-game
last_inspected: 2026-08-22
---

# Interstellar Armada: reusable implementation skill

## What this skill enables
- Newtonian physics engine: force/torque application, drag, box-collider hit detection, ray intersection
- Weapon/equipment system with cooldowns, barrel firing, homing missiles, damage calculation
- Velocity-based 6DOF camera controller with acceleration/deceleration
- Object pooling for particles, projectiles, missiles, trails, explosions
- AI pilots: fighter/ship/station/sentry types, attack runs, formations
- Mission scripting via JSON descriptors
- WebRTC peer-to-peer multiplayer

## Project classification
- **Type:** Complete game with mission-based gameplay, multiplayer, and editor
- **Suitable reuse cases:** Physics engine (force/torque/drag), weapon system with cooldowns and hit detection, camera controller, object pooling, AI combat behaviors, multiplayer state sync
- **Not suitable for:** Ground-based terrain, character animation, modern ESM bundling

## Technology and runtime
| Component | Technology |
|---|---|
| Rendering | Three.js (custom scene graph, shaders, LOD) |
| Physics | Custom Newtonian engine (`src/js/modules/physics.js`) |
| Audio | Web Audio API |
| Multiplayer | WebSocket + WebRTC (peer-to-peer) |
| Build | Grunt + RequireJS optimizer |
| Module system | AMD (RequireJS) |

## Run and build
```bash
npm install
grunt build          # production
grunt dev-build      # development
grunt watch          # auto-rebuild
# Serve root, open index.html
```

## Architecture map
| Path | Responsibility | Reuse value |
|---|---|---|
| `src/js/modules/physics.js` | Newtonian physics: Body, PhysicalObject, drag, force/torque, hit/collision | **HIGH** — portable physics engine |
| `src/js/armada/logic/equipment.js` | Weapon, Missile, Projectile, Thruster; flight modes; targeting; hit-check | **HIGH** — full weapon system |
| `src/js/modules/camera-controller.js` | Velocity-based 6DOF camera with acceleration/deceleration, transitions | **HIGH** — smooth camera control |
| `src/js/armada/logic/spacecraft.js` | Spacecraft entity: equipment, health, shields, faction, sound | **HIGH** — reusable entity pattern |
| `src/js/armada/logic/ai.js` | AI pilots: fighter/ship/station/sentry, attack runs, formations | **HIGH** — combat AI |
| `src/js/armada/networking.js` | WebSocket/WebRTC multiplayer: host/guest, state sync, Float32Array | **MEDIUM** — peer-to-peer networking |
| `src/js/modules/pools.js` | Object pooling for particles, projectiles, missiles, trails | **HIGH** — performance pattern |

## Core implementation recipe
1. **Physics foundation** (`src/js/modules/physics.js:436-962`): PhysicalObject handles position/orientation matrices, velocity, acceleration, drag, force/torque, box-body hit detection. Body provides ray-box intersection.
2. **Weapon system** (`src/js/armada/logic/equipment.js:1800-2000`): Weapon manages cooldown, barrel positions, aiming state machine (FIXED → NO_TARGET → AIMING → AIMED_IN_RANGE), projectile spawning via pool.
3. **Projectile pipeline** (`equipment.js:519`): Velocity matrix, lifetime, origin tracking for self-fire prevention. Hit detection uses octree spatial partitioning.
4. **Missile homing** (`equipment.js:900+`): Thruster-based turning, yaw/pitch targets, turning limit, target tracking.
5. **Camera controller** (`src/js/modules/camera-controller.js:28-434`): Velocity-target approach with configurable acceleration/deceleration, angular velocity for rotation, smooth transitions.
6. **Object pooling** (`src/js/modules/pools.js`): Pre-allocate particles, projectiles, missiles, trails for zero-allocation combat.
7. **AI system** (`src/js/armada/logic/ai.js:42-150`): Command-driven AI with fighter/ship/station/sentry types. Attack runs adjust approach distance based on miss count.

## Key patterns to reuse

### Newtonian Physics with Drag
- **Where:** `src/js/modules/physics.js:130-141` (applyDrag), `physics.js:726-737` (applyForce)
- **How:** Velocity stored as translation component of 4x4 matrix. Angular velocity as rotation component. Drag applies quadratic deceleration. Forces integrate as `ds = F/m * 0.5 * t²`.
- **Adaptation:** Replace drag/angularDrag constants. Set globally per environment.
- **Watch-outs:** Floating-point error accumulation on rotation matrices — use `straightenRotation4` cleanup.

### Pooled Projectile/Missile System
- **Where:** `src/js/armada/logic/equipment.js:519-599`
- **How:** Objects implement `canBeReused()`. Pool recycles inactive instances. Each projectile has velocity matrix, lifetime, origin spacecraft, hit callback.
- **Adaptation:** Add projectile types via JSON class definitions. Change pool sizes for performance.
- **Watch-outs:** Self-fire prevention via `_origin` tracking.

### Velocity-Based Camera Controller
- **Where:** `src/js/modules/camera-controller.js:356-418`
- **How:** Target velocity vector set by input; current velocity interpolates toward target with separate acceleration/deceleration rates.
- **Adaptation:** Change `_maxSpeed`, `_acceleration`, `_deceleration` per config.
- **Watch-outs:** Velocity is relative to camera, not world.

## Extension playbook
1. Port `physics.js` to your engine — zero Three.js dependencies (pure matrix math)
2. Adapt weapon classes for ground/vehicle combat — replace projectile visual with raycasts
3. Reuse camera velocity model for third-person or vehicle cameras
4. Extract AI command system for NPC behavior trees

## Limitations and risks
- RequireJS AMD module system — needs bundler for modern integration
- No TypeScript — no type safety
- Custom physics — lacks broadphase, constraints, joints; limited to box colliders
- Networking requires signaling server for WebRTC
- 5000+ line files — hard to refactor piecemeal

## Verification checklist
- [ ] Grunt builds without errors
- [ ] Newtonian physics applies drag correctly
- [ ] Weapons fire with cooldown timing
- [ ] Missiles home with thruster turning
- [ ] Camera follows with smooth acceleration
- [ ] AI pilots execute attack runs independently
- [ ] Object pools recycle without memory leaks

## Evidence
- `src/js/modules/physics.js` — 1100+ lines, complete physics engine
- `src/js/armada/logic/equipment.js` — 5326 lines, full weapon/flight system
- `src/js/modules/camera-controller.js` — 440 lines, camera controller
- `src/js/armada/logic/ai.js` — 2501 lines, AI pilot system
- `src/js/armada/networking.js` — 1982 lines, multiplayer networking
