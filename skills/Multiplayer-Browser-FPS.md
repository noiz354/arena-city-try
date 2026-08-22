---
name: threejs-multiplayer-fps-ecs
description: ECS-based multiplayer FPS with weapon hitscan, AABB physics, level editor, and Socket.IO networking
source_repository: gitlocked/Multiplayer-Browser-FPS
source_url: https://github.com/gitlocked/Multiplayer-Browser-FPS
project_status: complete-game
last_inspected: 2026-08-22
---

# Multiplayer-Browser-FPS: reusable implementation skill

## What this skill enables
- Entity Component System (ECS) game architecture with actions/reducers
- Hitscan weapon system with ammo, reloading, firerate, muzzle flash
- AABB collision detection and resolution (per-axis with step-up)
- 3D level editor with tile placement, rotation, export/import JSON
- Socket.IO multiplayer with client/server action dispatch
- First-person / third-person camera switching
- HUD rendering (health, ammo, crosshair, scoreboard, blood screen)

## Project classification
- **Type:** Complete game (multiplayer FPS)
- **Suitable reuse cases:** ECS architecture for GTA-like game logic, weapon/damage system, AABB collision, level editor for mission design, multiplayer networking
- **Not suitable for:** Vehicle physics, terrain generation, character animation blending

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js v0.96.0 |
| Language | JavaScript (ES6 modules, Babel) |
| Build tool | Parcel bundler |
| Physics / networking | Custom AABB, Socket.IO, Redux-like actions |

## Run and build
```bash
npm install
npm run dev              # Single-player
npm run build && npm run server  # Multiplayer
npm run editor          # Level editor
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `src/game/game.js` | Game class with dispatch/subscribe pattern | **High** |
| `src/game/update.js` | ECS systems: physics, shooting, camera, respawn | **High** |
| `src/game/entities.js` | Entity hierarchy: Player, Wall entities | **High** |
| `src/game/components.js` | Components: Player, Weapon, Velocity, Collider, Object3D | **High** |
| `src/game/utils.js` | AABB class with collision, hitScan (ray-aabb) | **High** |
| `src/client/js/game.js` | Client: renderer, pointer lock, input, socket.io, HUD | **High** |
| `src/server/index.js` | Server: Express + Socket.IO, action broadcasting | **High** |
| `src/editor-3d/editor.js` | 3D level editor with tile placement, export/import JSON | **High** |

## Core implementation recipe
1. **ECS dispatch** (`src/game/game.js:1-38`): Game holds State (entities, scene, camera) and subscribers. dispatch() runs reducer then notifies all subscribers.
2. **AABB collision** (`src/game/update.js:350-467`): Per-axis resolution: Y first (floor+walls), then X (with step-up for small obstacles), then Z. Rollback position on collision.
3. **Hitscan weapon** (`src/game/update.js:173-258`): Ray from camera origin along forward direction. Check intersection with all entities via ray-aabb. Apply damage (10 per hit). Kill triggers score sync.
4. **Weapon state** (`src/game/update.js:265-293`): loadedAmmo, reservedAmmo, firerateTimer, reloadTimer. Firerate counts down between shots. Reload transfers ammo over reloadSpeed duration.
5. **Networking** (`src/client/js/game.js:140-146`): Client dispatches actions through syncDispatch to socket. Server receives, applies, broadcasts to all other clients. Full state sync on join.
6. **Level editor** (`src/editor-3d/editor.js:1-226`): Extends Game class. TAB cycles tiles, click places via hitscan, R rotates, DEL deletes. exportLevelJson() serializes to JSON.

## Key patterns to reuse

### ECS Action Dispatch
- **Where:** `src/game/game.js`, `src/game/actions.js`
- **How:** Actions are {type, data}. Game.dispatch() runs reducer then notifies subscribers. Server broadcasts to clients.
- **Watch-outs:** Server is authoritative; no client prediction.

### Per-Axis AABB Collision
- **Where:** `src/game/update.js:350-467`
- **How:** Resolve Y (floor+walls), then X (step-up for obstacles <= STEP_SIZE=1), then Z. Each axis rollback on collision.
- **Watch-outs:** Step-up hardcoded to 1 unit.

### Hitscan Weapon
- **Where:** `src/game/update.js:173-258`, `src/game/utils.js:99-137`
- **How:** Ray from camera. ray-aabb intersection check. Fixed 10 damage per hit. Kill triggers respawn timer.
- **Watch-outs:** No damage falloff or headshot multiplier.

### 3D Level Editor
- **Where:** `src/editor-3d/editor.js`
- **How:** TAB cycles tile types, click places via hitscan, R rotates, DEL deletes. Exports as JSON with tile type/position/rotation.
- **Watch-outs:** No undo/redo.

## Extension playbook
1. Add vehicle: create VehicleEntity, implement enter/exit action
2. Add weapon switching: extend WeaponComponent with weapon type array
3. Add AI bots: create BotEntity with simple pathfinding
4. Add health packs: PickupEntity with collision detection

## Limitations and risks
- No player-to-player collision
- Grid-based physics (no slopes)
- No audio system
- Three.js v0.96.0 (2018)

## Evidence
- `src/game/game.js:1-38` - Game class with dispatch/subscribe
- `src/game/update.js:173-258` - shootingSystem with hitscan
- `src/game/update.js:350-467` - physicsSystem per-axis AABB
- `src/game/utils.js:99-137` - hitScan() ray-aabb intersection
- `src/server/index.js:41-68` - Server action broadcasting
- `src/editor-3d/editor.js:1-226` - Level editor
