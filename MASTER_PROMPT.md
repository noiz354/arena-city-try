# GTA-LIKE GAME MASTER PROMPT

> Build a GTA-like open-world game using Three.js and browser technologies.
> This prompt is designed for AI agents operating in sandboxed environments.

---

## CONSTRAINTS (Sandbox Environment)

You operate in an isolated sandbox with these hard limits:

- **Workspace root**: `/home/user` (cwd). Files here persist across messages.
- **Non-persistent**: `node_modules/`, `build/`, `dist/`, `.venv/`. Must reinstall each session.
- **Snapshot limit**: ~128 MB / 10,000 files per turn.
- **Bash**: Sandboxed, no stdin, no persistent shell state. Timeout 30s default, max 30min. Use `start_process` for long-running servers.
- **Network**: Server must bind `0.0.0.0` for live preview. External CDN resources do not load in sandbox iframe preview — use inline styles, SVG, data URIs.
- **No persistent memory**: Only files on disk. No cross-session memory.
- **Tools**: `bash`, file read/write/edit, `start_process`/`stop_process`/`get_process_output`, `web_search`, `fetch_page`, `image_search`, `generate_image`, `ask_user`, `present_file`.

---

## KNOWLEDGE BASE: 12 SKILLS

Load these skill files from `skills/` directory as needed. Each contains architecture maps, code references, key patterns, and extension playbooks.

### Tier 1 — Core GTA Systems (load first)

- **skills/Langenium.md** — Aircraft vehicle physics, missile combat with target locking, NPC AI with vision/pursue, 3rd-person chase camera, YUKA steering. Load when: building vehicles, combat, NPC AI.
- **skills/bloodwave-fps-game.md** — FPS weapon system (4 guns), raycast shooting, enemy AI with pathfinding, wave spawning, HUD, Web Audio. Load when: building shooting, HUD, enemy waves.
- **skills/SYNTHBLAST-threejs-game.md** — Projectile pooling, destructible buildings, homing enemy AI, camera toggle FPS/overhead, drone companion, power-ups. Load when: building destruction, enemy AI, camera modes.

### Tier 2 — Infrastructure & Engine

- **skills/openworld-js.md** — Chunk loading with DPZ spatial grid, Cannon.js physics, FPS controller, hook-based plugin system. Load when: building open world streaming, spatial LOD.
- **skills/mavonengine-core.md** — Authoritative server, state machine pattern, WebRTC multiplayer, entity hierarchy, Rapier3D physics, command protocol. Load when: building multiplayer, server architecture.
- **skills/interstellar-armada.md** — Newtonian physics (force/torque/drag), weapon cooldowns, object pooling, AI pilots, mission scripting, velocity camera. Load when: building physics, weapons, AI, missions.
- **skills/3d-game.md** — Cannon.js physics, third-person camera with wall clipping, socket.io player sync. Load when: building multiplayer sync, camera.

### Tier 3 — Specific Systems

- **skills/racing.md** — Vehicle physics (acceleration/friction/gravity), chase camera, track collision, checkpoint system, CPU AI, data-driven vehicle config. Load when: building car driving, racing.
- **skills/Edelweiss.md** — 3rd-person camera with wall avoidance, character controller with climbing/gliding, stamina system, runtime chunk loading. Load when: building on-foot traversal, stamina.
- **skills/Multiplayer-Browser-FPS.md** — ECS architecture, hitscan weapons, AABB collision, level editor, Socket.IO networking. Load when: building ECS, level editor.
- **skills/threejs-minecraft-clone.md** — Vite + Three.js scaffolding, toolbar UI, CSS overlay patterns. Load when: starting new project.
- **skills/Astray.md** — Maze generation, merged geometry rendering, smooth camera follow, state machine. Load when: building interiors, procedural rooms.


## BUILD ORDER: 7-PHASE WORKFLOW

### Phase 0: Project Scaffold
**Goal**: Working Three.js scene with renderer, camera, lights, game loop.

Steps:
1. Create Vite + TypeScript project
2. Setup: Scene, PerspectiveCamera, WebGLRenderer, animation loop
3. Add: DirectionalLight + AmbientLight + ShadowMap
4. Add: Basic ground plane (100x100)
5. Add: OrbitControls for debugging

Reference files:
- `reference/threejs-minecraft-clone/index.html` — HTML scaffold with toolbar UI
- `reference/threejs-minecraft-clone/vite.config.js` — Vite config
- `reference/threejs-minecraft-clone/package.json` — Dependencies (Three.js v0.172.0)
- `reference/mavonengine-core/packages/core/src/BaseGame.ts` — Game loop pattern
- `reference/mavonengine-core/packages/core/src/Game.ts` — Client game shell

### Phase 1: Player Controller
**Goal**: 3rd-person character that walks, runs, jumps in the world.

Steps:
1. Create Player class with GLTF model
2. Implement WASD movement with acceleration/deceleration
3. Add mouse-look rotation (yaw only for 3rd-person)
4. Add: Gravity, ground detection, jump
5. Add: 3rd-person camera with wall avoidance (raycast)
6. Add: Sprint with stamina drain

Reference files:
- `reference/racing/src/objects/Vehicle.ts` — Vehicle physics model (adapt for on-foot)
- `reference/Edelweiss/public/js/controler.js` — Inertia movement, wall climbing, gliding
- `reference/Edelweiss/public/js/CameraControl.js` — 3rd-person camera with wall avoidance
- `reference/3d-game/js/game/components/camera.js` — Collision-aware camera clipping
- `reference/Edelweiss/public/js/Stamina.js` — Stamina system with DOM bar UI

### Phase 2: Open World Streaming
**Goal**: Large explorable city that loads/unloads by proximity.

Steps:
1. Create chunk system (16x16m chunks)
2. Implement spatial grid indexing for O(1) lookups
3. Add distance-based LOD (3 detail levels)
4. Create procedural city generator (buildings, roads, props)
5. Wire chunk activate/deactivate to player position
6. Add memory cleanup on chunk unload

Reference files:
- `reference/openworld-js/src/obj/chunkManager.js` — DPZ spatial grid, multi-level activation
- `reference/Edelweiss/public/js/MapManager.js` — Runtime GLB chunk loading, zone switching
- `reference/openworld-js/src/core/main.js` — Dual-loop physics/render architecture
- `reference/openworld-js/src/common/hooks.js` — Event hook system for chunk events

### Phase 3: Vehicles & Driving
**Goal**: Enterable cars with realistic driving physics.

Steps:
1. Create Vehicle class with GLTF model
2. Implement: acceleration, deceleration, friction, gravity
3. Add: steering (yaw), tilt on turns
4. Add: chase camera behind vehicle
5. Add: enter/exit mechanic (E key near vehicle)
6. Add: collision with buildings/terrain
7. Add: vehicle damage system

Reference files:
- `reference/racing/src/objects/Vehicle.ts` — Vehicle physics: velocity, friction, gravity, collision
- `reference/racing/src/objects/Player.ts` — Chase camera positioning, thrust control
- `reference/racing/src/utils/interfaces.ts` — VehicleData interface (data-driven config)
- `reference/racing/data/vehicles/speeder_1.ts` — Vehicle config: acceleration, friction, turnRate
- `reference/racing/src/objects/CPU.ts` — AI path following (adapt for traffic)
- `reference/3d-game/js/game/components/physics.js` — Cannon.js physics setup
- `reference/SYNTHBLAST-threejs-game/js/classes/Hero.js` — Enter/exit mechanic pattern


### Phase 4: Combat & Weapons
**Goal**: Shooting, melee, and weapon pickup system.

Steps:
1. Create Weapon base class with cooldown
2. Implement raycast shooting (hitscan)
3. Add: projectile-based weapons (rockets, grenades)
4. Add: weapon HUD (ammo, crosshair, reload indicator)
5. Add: enemy AI with chase/attack behavior
6. Add: health/damage system for player and enemies
7. Add: weapon pickups from ground

Reference files:
- `reference/bloodwave-fps-game/js/shooting.js` — WEAPONS data-driven definitions, viewmodel, raycast
- `reference/bloodwave-fps-game/js/player.js` — FPS controller with weapon switching
- `reference/SYNTHBLAST-threejs-game/js/classes/Gun.js` — Projectile weapon with cooldown
- `reference/SYNTHBLAST-threejs-game/js/classes/Bullet.js` — Bullet pooling pattern
- `reference/bloodwave-fps-game/js/enemies.js` — Zombie chase/attack AI
- `reference/SYNTHBLAST-threejs-game/js/classes/Enemy.js` — Homing pursuit AI
- `reference/bloodwave-fps-game/js/hud.js` — Health bar, ammo, kill feed, damage vignette
- `reference/SYNTHBLAST-threejs-game/js/classes/Hero.js` — FPS/overhead camera toggle
- `reference/interstellar-armada/src/js/armada/logic/equipment.js` — Weapon cooldowns, homing missiles
- `reference/Multiplayer-Browser-FPS/src/game/update.js` — Hitscan shooting system

### Phase 5: NPCs & Traffic
**Goal**: Pedestrians, traffic, and living city.

Steps:
1. Create NPC class with GLTF models
2. Implement: walk along sidewalks, idle, flee from danger
3. Add: vehicle AI (drive along roads)
4. Add: NPC health, death, police alert
5. Add: wanted system (stars)
6. Add: NPC dialogue system (basic)

Reference files:
- `reference/Langenium/game/src/actors/pirate.ts` — Patrol/pursue NPC AI with vision detection
- `reference/Langenium/game/src/actors/cargoShip.ts` — Path-following NPC movement
- `reference/Langenium/game/src/systems/scanners.ts` — Vision cone, target acquisition state machine
- `reference/interstellar-armada/src/js/armada/logic/ai.js` — AI pilots: attack runs, formations
- `reference/SYNTHBLAST-threejs-game/js/classes/Drone.js` — Formation following, smooth steering
- `reference/interstellar-armada/src/js/armada/logic/equipment.js` — Weapon system for NPC combat

### Phase 6: Missions & Progression
**Goal**: Story missions, side quests, and progression.

Steps:
1. Create Mission system (trigger zones, objectives)
2. Implement: mission UI (objectives, waypoints)
3. Add: waypoint navigation (minimap + 3D markers)
4. Add: mission types (race, delivery, assassination, chase)
5. Add: money/XP system
6. Add: save/load (localStorage)

Reference files:
- `reference/interstellar-armada/src/js/armada/logic/equipment.js` — JSON mission descriptors
- `reference/racing/src/objects/Vehicle.ts` — Checkpoint/lap system (adapt for waypoints)
- `reference/Multiplayer-Browser-FPS/src/editor-3d/editor.js` — 3D level editor for mission design
- `reference/mavonengine-core/packages/core/src/World/Actor.ts` — State stack pattern
- `reference/mavonengine-core/packages/core/src/Networking/syncState.ts` — State reconciliation

### Phase 7: Polish & Performance
**Goal**: Visual polish, audio, and optimization.

Steps:
1. Add: day/night cycle
2. Add: weather effects (rain, fog)
3. Add: particle effects (explosions, smoke, sparks)
4. Add: spatial audio (Web Audio API)
5. Add: post-processing (bloom, vignette, screen shake)
6. Add: mobile touch controls
7. Optimize: instancing, LOD, frustum culling
8. Add: loading screen

Reference files:
- `reference/bloodwave-fps-game/js/audio.js` — Web Audio API sound manager
- `reference/interstellar-armada/src/js/modules/pools.js` — Object pooling for particles
- `reference/Edelweiss/public/js/Optimizer.js` — FPS-based quality auto-scaling
- `reference/racing/src/scenes/GameScene.ts` — UnrealBloomPass post-processing
- `reference/SYNTHBLAST-threejs-game/js/classes/Particle.js` — Death explosion particles
- `reference/SYNTHBLAST-threejs-game/js/classes/Building.js` — Destructible environment


---

## IMPLEMENTATION RULES

1. **Load skill files** before implementing each phase. Read the architecture map and key patterns.
2. **Copy code patterns** from skills — adapt, don't rewrite from scratch.
3. **Test each phase** before moving to the next. Run `npm run dev` and verify.
4. **Use inline styles** for all UI (no CDN CSS/fonts in sandbox iframe).
5. **Use procedural geometry** for prototypes — replace with GLTF models later.
6. **No external dependencies** beyond Three.js + Vite. Keep it minimal.
7. **TypeScript always** — strict mode, proper interfaces.
8. **File structure**: `src/game/`, `src/systems/`, `src/entities/`, `src/ui/`, `src/utils/`.
9. **Commit after each phase** — working game at every stage.

---

## ASSET PIPELINE (Sandbox-Safe)

Since CDN resources don't load in sandbox preview:

1. **3D Models**: Use `GLTFLoader` with local GLB files. For prototyping, use procedural Box/Cylinder geometry.
2. **Textures**: Create with `CanvasTexture` (procedural) or embed as data URIs.
3. **UI**: All HTML/CSS inline. No external fonts — use system fonts or embed as base64.
4. **Audio**: Use Web Audio API oscillators for placeholder sounds. Real audio files as local `.mp3`/`.wav`.
5. **Skybox**: Use `THREE.Color` gradient or procedural sky shader.

---

## PRODUCTION TECHNOLOGY STACK

| Layer | Technology | Why |
|---|---|---|
| Rendering | Three.js (latest via npm) | Industry standard WebGL |
| Language | TypeScript (strict) | Type safety for large codebase |
| Build | Vite | Fast HMR, ESM, good DX |
| Physics | Rapier3D (WASM) or Cannon.js | Rapier is faster; Cannon is simpler |
| AI Steering | YUKA or custom | YUKA for pathfinding; custom for simple |
| Networking | socket.io or geckos.io | socket.io for simplicity; geckos for UDP |
| Audio | Web Audio API | Spatial audio, procedural sounds |
| UI | HTML/CSS overlay or Pixi.js | HTML for HUD; Pixi for complex 2D |
| Models | GLTF/GLB via GLTFLoader | Industry standard 3D format |

---

## KEY ARCHITECTURE PATTERNS

### Game Loop (from mavonengine-core)
```
class BaseGame extends EventEmitter {
  update(dt) {
    this.physicsWorld.step(dt);
    this.world.update(dt);
    this.onUpdate(dt);
  }
}
```

### Entity Hierarchy (from mavonengine-core)
```
GameObject -> Actor -> LivingActor -> NetworkedActor -> Player
```
Each level adds: position/orientation -> state stack -> health -> network sync -> player input

### State Stack (from mavonengine-core)
```
state: EntityState[] // stack of active states
// States: idle, walking, running, driving, shooting, dead
// Each state has: enter(), update(), leave(), suspend()
```

### Weapon System (from bloodwave-fps-game)
```
WEAPONS = {
  pistol: { damage: 20, fireRate: 400, magSize: 12, ... },
  rifle: { damage: 15, fireRate: 100, magSize: 30, ... },
  shotgun: { damage: 8, fireRate: 800, magSize: 6, pellets: 8, ... },
}
```

### Vehicle Physics (from racing)
```
velocity += direction * acceleration * thrust;
velocity *= friction;  // 0.98
velocity.y -= gravity;
position += velocity;
```

### Chunk Loading (from openworld-js)
```
// DPZ levels: 0=10000m, 1=200m, 2=100m, 3=20m, 4=5m, 5=1m
// Each frame: compute player grid cell, activate 3x3 neighborhood
```

### AI State Machine (from Langenium)
```
// States: patrol -> (vision detect) -> pursue -> (target lost) -> patrol
// YUKA behaviors: FollowPath, Pursuit, Arrive
```

---

## CRITICAL: Sandbox Preview Rules

When showing the game in sandbox iframe preview:

1. **All CSS must be inline** — no `<link>` to external stylesheets
2. **All fonts must be system** — `font-family: Arial, sans-serif`
3. **All scripts must be bundled** — no `<script src="cdn...">`
4. **Server binds 0.0.0.0** — not 127.0.0.1
5. **No WebSocket to external servers** — use in-process state
6. **Test with**: `python -m http.server 8080` or `npx vite --host 0.0.0.0`

---

## QUICK START COMMAND

```bash
# Scaffold project
npm create vite@latest gta-game -- --template vanilla-ts
cd gta-game
npm install three @types/three
npm install -D vite
npm run dev -- --host 0.0.0.0
```

---

## REFERENCE SOURCE FILES (93 files)

Actual implementation code copied from 12 repos. Read these to study patterns before coding.

### reference/Langenium/ — Vehicle, Combat, NPC AI
- `game/src/objects/aircraft/base.ts` — Aircraft physics (velocity, throttle, drag, heading)
- `game/src/objects/aircraft/raven.ts` — Aircraft subclass with stat overrides
- `game/src/actors/base.ts` — Actor entity (YUKA vehicle + mesh + scanners + weapons)
- `game/src/actors/pirate.ts` — NPC AI: patrol path + pursue with vision detection
- `game/src/actors/cargoShip.ts` — Passive NPC: ArriveBehavior path-following
- `game/src/systems/scanners.ts` — Target acquisition: vision cone, scan/lock/track state machine
- `game/src/systems/weapons.ts` — Weapon firing: cooldown, scanner-driven auto-fire
- `game/src/systems/base.ts` — Base system: last-run timestamp + timeout cooldown
- `game/src/objects/projectiles/missile.ts` — Missile with 5m distance-based hit detection
- `client/src/app/scenograph.js` — Scene manager, GPU tier check, animation loop
- `client/src/app/scenograph/cameras.js` — 3rd-person chase camera with rotation follow

### reference/bloodwave-fps-game/ — Weapons, Enemies, HUD
- `js/shooting.js` — 4 weapons (M4, MP5, SPAS-12, AWP), viewmodel, raycast, muzzle flash
- `js/enemies.js` — Zombie AI: spawn, chase, attack, procedural model, animation
- `js/player.js` — FPS controller: mouse look, WASD, jump, sprint, gravity, collision
- `js/scene.js` — Procedural terrain, buildings, trees (instanced), rocks, lighting
- `js/waves.js` — Wave manager: 8 configs, difficulty scaling, ammo drops
- `js/hud.js` — Health bar, damage vignette, kill feed, score, hit indicators
- `js/audio.js` — Web Audio API sound manager with per-event volume
- `js/main.js` — Game loop: init, start/pause/restart, system wiring

### reference/SYNTHBLAST-threejs-game/ — Projectiles, Destruction, AI
- `js/classes/Gun.js` — Gun: fire rate, bullet spawning, ammo, cooldown
- `js/classes/Bullet.js` — Bullet: projectile with velocity, lifetime, pooling
- `js/classes/Enemy.js` — Enemy AI: homing pursuit toward predicted position
- `js/classes/Building.js` — Destructible building: height-based HP, animated collapse
- `js/classes/Hero.js` — Player: movement, perspective toggle (FPS/overhead), shield
- `js/classes/Drone.js` — Drone companion: formation follow, hover, smooth steering
- `js/classes/Level.js` — Level generator: grid-based placement, collision, win condition
- `js/classes/Particle.js` — Death explosion: random velocity cones
- `js/classes/powerups/Shield.js` — Magnetic attraction pickup pattern
- `js/classes/powerups/Pad.js` — Collectible pad with scale-down animation

### reference/openworld-js/ — Chunk Loading, Spatial Grid
- `src/obj/chunkManager.js` — DPZ spatial grid, multi-level chunk activation
- `src/player/control.js` — FPS controller: pointer lock, WASD, sprint, jump
- `src/core/main.js` — Cannon.js world setup, canvas, animation loops
- `src/core/animate.js` — Animation frame management
- `src/common/hooks.js` — Event hook system for extensibility

### reference/mavonengine-core/ — Server, Multiplayer, State
- `packages/core/src/BaseGame.ts` — Headless game loop: physics step, world update, tick
- `packages/core/src/Game.ts` — Client game: canvas, renderer, camera, input, resources
- `packages/core/src/InputManager.ts` — Keyboard/mouse state, pointer raycasting
- `packages/core/src/Networking/Server/Server.ts` — Geckos server, command buffer, state sync
- `packages/core/src/Networking/Server/Commands.ts` — Command types and protocol
- `packages/core/src/Networking/Server/Client.ts` — Server-side client representation
- `packages/core/src/Networking/Server/World.ts` — Server world state
- `packages/core/src/Networking/Client/NetworkManager.ts` — Client socket, command queue, ping
- `packages/core/src/Networking/NetworkedEntity.ts` — Network entity interface
- `packages/core/src/Networking/syncState.ts` — State stack reconciliation
- `packages/core/src/Networking/Entities/Player.ts` — Player entity template
- `packages/core/src/World/Actor.ts` — Game object with state stack
- `packages/core/src/World/LivingActor.ts` — Actor with health, damage, healing

### reference/interstellar-armada/ — Physics, Weapons, AI, Missions
- `src/js/modules/physics.js` — Newtonian physics: force/torque, drag, hit detection
- `src/js/armada/logic/equipment.js` — Weapon/Missile/Projectile: cooldown, targeting, hit-check
- `src/js/modules/camera-controller.js` — Velocity-based 6DOF camera with acceleration
- `src/js/armada/logic/ai.js` — AI pilots: fighter/ship/station/sentry, attack runs
- `src/js/modules/pools.js` — Object pooling for particles, projectiles, missiles
- `src/js/armada/logic/spacecraft.js` — Spacecraft entity: equipment, health, shields

### reference/3d-game/ — Multiplayer, Camera, Physics
- `js/game/components/camera.js` — Third-person camera with wall clipping
- `js/game/components/network.js` — Socket.io client multiplayer sync
- `js/game/components/physics.js` — Cannon.js physics setup
- `js/game/components/players.js` — Player entity management
- `js/game/components/controls.js` — Input controls
- `js/game/components/scene.js` — Scene setup and management
- `js/engine/main.js` — Engine bootstrap
- `js/engine/components/network.js` — Engine networking layer
- `js/game/main.js` — Game initialization

### reference/racing/ — Vehicle Driving, Checkpoints
- `src/objects/Vehicle.ts` — Vehicle: velocity, gravity, raycast collision, turning, checkpoints
- `src/objects/Player.ts` — Player input, thrust gauge, chase camera, engine sound
- `src/objects/CPU.ts` — AI pathfinding along track vectors
- `src/objects/Track.ts` — Catmull-Rom/ellipse spline track, checkpoint planes
- `src/scenes/GameScene.ts` — Game loop, countdown, race state, postprocessing
- `src/utils/interfaces.ts` — VehicleData, TrackData, Checkpoint interfaces
- `data/vehicles/speeder_1.ts` — Vehicle config: acceleration, friction, turnRate, dimensions

### reference/Edelweiss/ — On-Foot, Camera, Stamina, Streaming
- `public/js/controler.js` — Character controller: movement, climbing, gliding, wall-jump
- `public/js/CameraControl.js` — 3rd-person camera: wall avoidance, yaw offset, dodge
- `public/js/Stamina.js` — Stamina: sections, DOM bar, reduce/reset, blink
- `public/js/atlas.js` — AABB collision detection for ground/wall/cube
- `public/js/MapManager.js` — Runtime GLB chunk loading, zone switching
- `public/js/Optimizer.js` — FPS-based quality auto-scaling (4 levels)
- `public/js/AssetManager.js` — Asset loading, character creation
- `public/js/charaAnim.js` — Character animation states

### reference/Multiplayer-Browser-FPS/ — ECS, Weapons, Level Editor
- `src/game/game.js` — ECS: dispatch/subscribe pattern, state management
- `src/game/update.js` — Systems: physics, shooting, camera, respawn
- `src/game/entities.js` — Entity hierarchy: Player, Wall
- `src/game/components.js` — Components: Player, Weapon, Velocity, Collider, Object3D
- `src/game/utils.js` — AABB class with collision, hitScan (ray-aabb)
- `src/game/actions.js` — Action types and reducers
- `src/client/js/game.js` — Client: renderer, pointer lock, input, socket.io, HUD
- `src/server/index.js` — Server: Express + Socket.IO, action broadcasting
- `src/editor-3d/editor.js` — 3D level editor: tile placement, export/import JSON

### reference/threejs-minecraft-clone/ — Scaffold
- `index.html` — Game page with toolbar UI, overlay instructions
- `style.css` — Toolbar styling, overlay positioning
- `vite.config.js` — Vite configuration
- `package.json` — Three.js v0.172.0, Vite v6.0.5

### reference/Astray/ — Maze, Camera, State Machine
- `maze.js` — Recursive backtracker maze generation
- `index.html` — Complete game: scene, physics, rendering, state machine
