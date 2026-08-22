---
name: threejs-multiplayer-3d-physics
description: Multiplayer 3D environment with Cannon.js physics, third-person camera, socket.io networking
source_repository: momo5502/3d-game
source_url: https://github.com/momo5502/3d-game
project_status: complete-game
last_inspected: 2026-08-22
---

# 3d-game: reusable implementation skill

## What this skill enables
- Multiplayer 3D environment with real-time player synchronization
- Cannon.js physics with gravity, collision detection, player colliders
- Third-person camera with collision-aware clipping
- Socket.io networking for player state sync
- GLTF model loading with animation

## Technology
| Area | Implementation |
| --- | --- |
| Renderer | Three.js r154 |
| Language | TypeScript |
| Build | webpack 5 + ts-loader |
| Physics | Cannon.js (cannon-es) |
| Networking | socket.io |

## Run
```bash
npm install && npm run dev
```

## Architecture
| Path | Reuse |
| --- | --- |
| `src/game/ThirdPersonCamera.ts` | **High** - camera with wall clipping |
| `src/game/Network.ts` | **High** - multiplayer sync |
| `src/game/Player.ts` | **High** - player entity |
| `src/game/Physics.ts` | **High** - Cannon.js setup |
| `src/server/index.ts` | **High** - server pattern |
| `src/game/World.ts` | **High** - game loop |

## Key patterns

### Third-Person Camera with Collision
Camera at player + offset. Raycast from player to camera. If hit, move camera to hit point. Smooth interpolation.

### Socket.io Player Sync
Client sends position/rotation at 30Hz. Server stores and broadcasts all positions. Client interpolates received positions.

### Physics-Render Sync
Copy Cannon.Body position/quaternion to Three.js mesh each frame.

## Extension playbook
1. Add shooting: Projectile + raycast + socket.io hit events
2. Add vehicles: Cannon.js vehicle constraint + enter/exit
3. Add terrain: heightmap chunks + Cannon.js heightfield

## Risks
- Cannon.js less maintained than Rapier3D
- No client prediction or lag compensation
- No audio or particles

## Evidence
- `src/game/ThirdPersonCamera.ts` - collision-aware camera
- `src/game/Network.ts` - socket.io client sync
- `src/game/Player.ts` - player entity with physics
- `src/server/index.ts` - Express + Socket.IO server
