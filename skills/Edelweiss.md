---
name: threejs-third-person-platformer
description: 3D platformer with custom AABB physics, 3rd-person camera, stamina system, wall climbing, gliding, and runtime map loading
source_repository: felixmariotto/Edelweiss
source_url: https://github.com/felixmariotto/Edelweiss
project_status: complete-game
last_inspected: 2026-08-22
---

# Edelweiss: reusable implementation skill

## What this skill enables
- 3rd-person camera with wall avoidance and obstacle dodging
- Custom AABB character controller with wall climbing (4 wall types), gliding, dashing, wall-jump
- Stamina system with DOM bar UI, reduce/reset operations
- Runtime chunked map loading from GLB files with zone switching (mountain/cave)
- Auto-optimization system that adjusts quality based on FPS
- Multiplayer via Socket.IO

## Project classification
- **Type:** Complete game (3D platformer)
- **Evidence:** Full game with mountain climbing, cave exploration, edelweiss flower collection, stamina management, multiplayer, map editor support
- **Suitable reuse cases:** 3rd-person camera for GTA-like on-foot gameplay, character controller with climbing for parkour/traversal, stamina system for sprinting/climbing, runtime chunk loading for open world streaming, performance auto-scaling
- **Not suitable for:** Vehicle physics, first-person shooting, terrain generation

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js (bundled), EffectComposer with FXAA |
| Language | Vanilla JavaScript (ES5-style, IIFE modules) |
| Build tool | None (script tags, no bundler) |
| Package manager | npm (Express server only) |
| Physics / networking / state / audio | Custom AABB collision (atlas module), Socket.IO multiplayer, custom stamina/input/gameState modules |
| Target platforms | Web (desktop + mobile, auto-optimizing) |

## Run and build
```bash
npm install
npm start        # Express server on default port
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `public/js/controler.js` | Character controller: movement, gravity, climbing, gliding, dashing, wall-jump, ledge haul, stamina | **High** - GTA-like on-foot traversal |
| `public/js/CameraControl.js` | 3rd-person camera: ray-based wall avoidance, yaw offset, distance adjustment, obstacle dodge | **High** - 3rd-person camera |
| `public/js/Stamina.js` | Stamina: sections, DOM bar, reduce/reset, blink on empty | **High** - stamina resource |
| `public/js/atlas.js` | Physics engine: AABB collision detection for ground/wall/cube, scene graph, player dimensions | **High** - collision system |
| `public/js/MapManager.js` | Runtime chunk loading: GLB files, mountain/cave zone switching, fog/background/lighting changes | **High** - world streaming |
| `public/js/Optimizer.js` | Auto-performance: 4 levels (FXAA, pixel ratio, shadows, draw distance), FPS sampling | Medium - adaptive quality |
| `public/js/AssetManager.js` | Asset loading, character creation, material management | Medium |
| `public/js/charaAnim.js` | Character animation states (run, idle, climb, glide, die, etc.) | Medium |

## Core implementation recipe
1. **3rd-person camera** (`public/js/CameraControl.js:121-461`): Constant offset `CAMERA_DIRECTION = (0, 0.4, 1).normalize()` at distance 2.2; cast rays left/right for wall proximity; apply yaw offset clamped to MAX_YAW=0.2; cast camera ray for obstacles; dodge via `attemptCameraMove()` with lerp.
2. **Inertia movement** (`public/js/controler.js:356-612`): Speed accumulates on input, decays faster on ground vs air; direction tweening with different rates for ground (1/4) vs air (1/20).
3. **Wall climbing** (`public/js/controler.js:442-524`): 4 wall types (easy/medium/hard/slip) set climbSpeedFactor; climb uses CLIMBVEC rotated by contact direction; costs CLIMBPRICE * moveSpeedRatio * 2 stamina per frame.
4. **Gliding** (`public/js/controler.js:314-345`): Triggered after holding space 200ms airborne; fall speed set to -0.1; costs GLIDINGPRICE=0.015 stamina/frame.
5. **Runtime map loading** (`public/js/MapManager.js:2-274`): Loads GLB chunks near player via GLTFLoader; switches zone groups (mountain/cave) with lighting/fog changes.
6. **Auto-optimize** (`public/js/Optimizer.js:2-180`): Samples FPS; optimizes above 28 FPS threshold (disable FXAA, lower pixel ratio, disable shadows, reduce draw distance); de-optimizes below 53 FPS.

## Key patterns to reuse

### 3rd-Person Camera with Wall Avoidance
- **Where it lives:** `public/js/CameraControl.js`
- **How it works:** Rays left/right for wall proximity; yaw offset; camera ray for obstacles; dodge around obstacles; lerp with collision rollback
- **Adaptation recipe:** Change CAMERA_DIRECTION for different angles, adjust MAX_YAW for tighter/looser camera
- **Watch-outs:** Camera path checking uses atlas.intersectRay which is game-specific

### Runtime Map Streaming
- **Where it lives:** `public/js/MapManager.js`
- **How it works:** Divides world into chunks (CHUNK_SIZE=12); loads GLB files on demand; caches loaded chunks; switches between zone groups with lighting/fog changes
- **Adaptation recipe:** Change chunk size, load from different sources, add LOD per chunk
- **Watch-outs:** Chunks loaded from S3 URLs hardcoded in the module

### Wall Type System
- **Where it lives:** `public/js/controler.js:1339-1465`
- **How it works:** Wall tiles tagged as wall-easy/medium/hard/slip/fall; each sets climbSpeedFactor; slip-walls cause slow fall; fall-walls push player off
- **Adaptation recipe:** Add new wall types with different climb multipliers; tie to material system

## Assets, configuration, and controls
- **Controls:** Arrow keys / WASD movement, Space (hold for glide/dash), camera auto-positioned
- **Configuration:** Constants in controler.js (CLIMBPRICE, GLIDINGPRICE, SPEED, etc.)
- **Assets:** GLB models loaded at runtime from S3, DRACO-compressed

## Extension playbook
1. Add sprint: extend stamina system with sprint cost, increase SPEED when sprint key held
2. Add double-jump: track hasDoubledJumped flag, apply jumpSpeed again mid-air
3. Add wall-run: extend wall type system with wall-run type maintaining horizontal velocity
4. Add grapple: raycast from player, create pendulum physics toward hit point

## Limitations and risks
- No physics engine - all collision is custom AABB
- Wall climbing requires axis-aligned walls (no slopes)
- Camera uses fixed offset direction (no orbit)
- ES5-style code with global variables
- Map chunks loaded from hardcoded S3 URLs

## Verification checklist
- [ ] Camera avoids walls and adjusts yaw in corridors
- [ ] Character moves with inertia and deceleration
- [ ] Wall climbing works on all 4 wall types
- [ ] Gliding reduces fall speed, costs stamina
- [ ] Stamina bar UI updates and blinks when empty
- [ ] Map chunks load progressively near player
- [ ] Quality auto-adjusts based on FPS

## Evidence
- `public/js/CameraControl.js:121-461` - Camera ray, wall avoidance, dodge, lerp positioning
- `public/js/controler.js:356-612` - Horizontal movement with inertia
- `public/js/controler.js:442-524` - Wall climbing with stamina cost
- `public/js/controler.js:314-345` - Gliding state
- `public/js/Stamina.js:2-163` - Stamina system with DOM updates
- `public/js/MapManager.js:2-274` - Runtime chunk loading
- `public/js/Optimizer.js:2-180` - FPS-based quality auto-scaling
