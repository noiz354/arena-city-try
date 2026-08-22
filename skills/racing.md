---
name: threejs-racing-vehicle-physics
description: Chase camera racing game with vehicle physics, track collision, checkpoint system, and CPU AI opponents
source_repository: leslieyip02/racing (also evanbillet/3D_racing_game, identical codebase)
source_url: https://github.com/leslieyip02/racing
project_status: complete-game
last_inspected: 2026-08-22
---

# Racing: reusable implementation skill

## What this skill enables
- Vehicle physics with acceleration, deceleration, friction, and gravity
- Chase camera that follows behind and above the vehicle
- Track collision via raycasting against extruded spline geometry
- Checkpoint/lap system with modular index validation
- CPU opponent AI following path vectors along the track
- Moving platforms with sinusoidal motion
- Touch joystick controls for mobile
- Postprocessing bloom effects

## Project classification
- **Type:** Complete racing game
- **Evidence:** Full game loop with countdown, 2-lap race, CPU opponents, finish screen, lap timer, race ranking (GameScene.ts:307-353)
- **Suitable reuse cases:** Vehicle physics engine for GTA-like driving, chase camera system, checkpoint/waypoint navigation for AI, procedural track generation from spline data, moving platform mechanics
- **Not suitable for:** First-person gameplay, character animation, terrain generation, networking/multiplayer

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js v0.147.0, EffectComposer with UnrealBloomPass |
| Language | TypeScript (strict, webpack-bundled) |
| Build tool | Webpack 5.75.0 with ts-loader |
| Package manager | npm |
| Physics / networking / state / audio | Custom raycast collision, no networking, AudioContext oscillator for engine sound, HTMLAudioElement for SFX |
| Target platforms | Web (desktop + mobile via touch joystick) |

## Run and build
```bash
# Prerequisites: Node.js 16+
npm install
npm run build          # webpack production build
# Deploy: npm run deploy  (gh-pages)
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `src/objects/Vehicle.ts` | Base vehicle: velocity, gravity, raycast track collision, turning (yaw/roll/pitch), checkpoint detection, out-of-bounds respawn | **High** - core GTA driving physics |
| `src/objects/Player.ts` | Player input, thrust gauge, chase camera positioning, engine sound | **High** - player vehicle + camera |
| `src/objects/CPU.ts` | AI pathfinding along track vectors, random speed variation | **High** - NPC vehicle AI |
| `src/objects/Track.ts` | Catmull-Rom/ellipse spline track generation, checkpoint planes, moving platforms | **High** - procedural track generation |
| `src/scenes/GameScene.ts` | Game loop, countdown, race state, controls, postprocessing | Medium - scene orchestration |
| `src/utils/interfaces.ts` | TypeScript interfaces for VehicleData, TrackData, Checkpoint, etc. | **High** - reusable data contracts |
| `data/vehicles/` | Vehicle config: acceleration, friction, turnRate, dimensions, model path | **High** - data-driven vehicle tuning |
| `data/tracks/` | Track data: curves, layers, checkpoints, colors | Medium - track definitions |

## Core implementation recipe
1. **Define vehicle properties** with `VehicleData` interface: acceleration (0.00125), deceleration, friction (0.98), turnRate (0.0006), maxRoll, gravity, hitbox dimensions (`src/utils/interfaces.ts:73-86`)
2. **Create base Vehicle class** with position/direction/rotation vectors, GLTF model loading via GLTFLoader, invisible hitbox mesh for collision (`src/objects/Vehicle.ts:7-129`)
3. **Implement track collision** using raycasting from hitbox vertices against track body mesh and moving platform meshes; compute surface normal to align vehicle pitch; snap Y to collision point (`src/objects/Vehicle.ts:131-236`)
4. **Add turning** via `applyAxisAngle` on the up vector for yaw; compute roll from turn angle; clamp to maxRoll (`src/objects/Vehicle.ts:238-248`)
5. **Build chase camera** positioned behind vehicle (offset by -facingDirection * 3) and above (+1.5 Y), with `lookAt` targeting a point further ahead of the vehicle (`src/objects/Player.ts:39-68`)
6. **Implement thrust system** where arrow keys increase/decrease a 0-1 thrust multiplier that scales acceleration (`src/objects/Player.ts:87-99`)
7. **Create checkpoint system** with invisible PlaneGeometry meshes; detect intersection via raycasting; validate checkpoint index is greater than lastCheckpointIndex with modular arithmetic (`src/objects/Vehicle.ts:193-226`)
8. **Generate tracks** from CatmullRomCurve3 or EllipseCurve, extruded with THREE.ExtrudeGeometry, supporting multiple layers (surface, collision, outline) (`src/objects/Track.ts:93-200`)
9. **Add CPU AI** that finds nearest path point index, sets direction from track.pathVectors, and applies velocity directly (`src/objects/CPU.ts:21-61`)
10. **Add moving platforms** with sinusoidal position updates based on elapsed time, period, and phase offset (`src/objects/Track.ts:257-277`)

## Key patterns to reuse

### Vehicle Physics Model
- **Where it lives:** `src/objects/Vehicle.ts`
- **How it works:** Velocity accumulates from directional inputs scaled by thrust, friction multiplies velocity each frame, gravity applies constant downward force, position updates by velocity
- **Adaptation recipe:** Extract acceleration/friction/gravity constants, adapt direction vector from car-forward to any axis, add drift/skid mechanics by decoupling velocity direction from facing direction
- **Watch-outs:** Delta time usage causes "jumps" on tab-away (documented in README); fix by capping dt

### Raycast Track Collision
- **Where it lives:** `src/objects/Vehicle.ts:131-236`
- **How it works:** Casts rays from each hitbox vertex toward vehicle center; checks intersection distance against direction vector length; uses surface normal to compute vehicle pitch
- **Adaptation recipe:** Replace track mesh with any terrain/road mesh; adapt normal calculation for different surface orientations
- **Watch-outs:** surfaceNormal.y < 0 check prevents flipping; always negate upward normals

### Chase Camera
- **Where it lives:** `src/objects/Player.ts:39-68`
- **How it works:** Camera positioned at `vehiclePosition - facingDirection * 3 + Y*1.5`, looking at `vehiclePosition + facingDirection`
- **Adaptation recipe:** Adjust offset vectors for different follow distances/heights; add smooth lerp for camera lag; add OrbitControls toggle for debug
- **Watch-outs:** Manual camera toggle can break racing feel

### Checkpoint Lap System
- **Where it lives:** `src/objects/Vehicle.ts:193-226`
- **How it works:** Each checkpoint has an index; vehicle tracks `lastCheckpointIndex`; new checkpoint accepted only if `checkpoint.index > lastCheckpointIndex % checkpoints.length`; index 1 increment triggers lap counter
- **Adaptation recipe:** Change checkpoint count, adjust lap threshold, add checkpoint skipping for shortcuts (already supported by modular check)
- **Watch-outs:** Checkpoints are 1-based; modular arithmetic enables shortcuts

### Data-Driven Vehicle Config
- **Where it lives:** `data/vehicles/speeder_1.ts`
- **How it works:** VehicleData interface defines all tunable parameters; multiple vehicle configs imported and selected by index
- **Adaptation recipe:** Create new VehicleData objects for different vehicle types (trucks, bikes, etc.); adjust acceleration/friction/turnRate per vehicle class
- **Watch-outs:** Hitbox dimensions must match visual model proportions

## Assets, configuration, and controls
- **Controls:** WASD movement, arrow up/down thrust, R reverse camera, scroll wheel for thrust
- **Configuration:** `data/vehicles/*.ts` for vehicle stats, `data/tracks/*.ts` for track layout
- **Assets:** GLTF models in `assets/models/`, sounds in `assets/sounds/`
- **Postprocessing:** UnrealBloomPass (strength 1.6, radius 0.1, threshold 0.9)

## Extension playbook
1. Add new vehicle type: create `data/vehicles/new_vehicle.ts` with VehicleData, add to vehicles.ts array
2. Add new track: create `data/tracks/new_track.ts` with TrackData, update tracks import
3. Add drifting: modify velocity application in `Player.ts` to use separate drift vector with reduced friction
4. Add speed boost pads: add checkpoint-like detection objects that temporarily increase acceleration
5. Add damage system: extend Vehicle with health, detect collisions with other vehicles via hitbox overlap

## Limitations and risks
- No suspension or wheel physics - vehicle floats on track surface
- Delta time not capped - tab-away causes position jumps
- No vehicle-to-vehicle collision
- Track must be single continuous mesh per layer
- CPU AI is basic path following with no obstacle avoidance
- No audio spatialization

## Verification checklist
- [ ] Vehicle accelerates and decelerates with thrust control
- [ ] Camera follows behind vehicle with look-ahead
- [ ] Vehicle pitches on slopes correctly
- [ ] Checkpoints register in order, laps increment
- [ ] Out-of-bounds resets to last checkpoint
- [ ] Moving platforms carry vehicle
- [ ] CPU opponents follow track path
- [ ] Touch joystick works on mobile
- [ ] Race completes after 2 laps with ranking

## Evidence
- `src/objects/Vehicle.ts:250-271` - handleVehicleMovement(): friction, gravity, position/rotation update
- `src/objects/Vehicle.ts:131-236` - handleTrackCollision(): raycast collision with surface normal alignment
- `src/objects/Player.ts:39-68` - handleCameraMovement(): chase camera positioning
- `src/objects/Player.ts:87-126` - handleInput(): thrust control, WASD, engine sound
- `src/objects/CPU.ts:38-61` - update(): AI path following
- `src/objects/Track.ts:93-147` - createCatmullRom()/createEllipse(): spline track generation
- `src/scenes/GameScene.ts:356-383` - update(): game loop orchestration
- `src/utils/interfaces.ts:73-86` - VehicleData: data-driven vehicle configuration
