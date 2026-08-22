---
name: mavonengine-core-multiplayer-engine
description: TypeScript Three.js game engine with Rapier3D physics, authoritative server, WebRTC multiplayer, entity/state system, and chunk streaming
source_repository: MavonEngine/Core
source_url: https://github.com/MavonEngine/Core
project_status: starter
last_inspected: 2026-08-22
---

# MavonEngine Core: reusable implementation skill

## What this skill enables
- Full-stack TypeScript game engine on Three.js (rendering) + Rapier3D (physics) + geckos.io (WebRTC UDP networking)
- Shared BaseGame class: server runs physics headlessly, client adds rendering
- State sync via distance-based entity culling with hash-based change detection
- Entity hierarchy: GameObject → Actor → LivingActor → NetworkedActor → Player
- State stack pattern with enter/update/leave/suspend lifecycle
- Character controller with Rapier3D kinematic body
- Chunk streaming foundation for open worlds

## Project classification
- **Type:** Monorepo engine (npm workspaces): packages/core, bootstrap, editor, multiplayer-template. Early WIP.
- **Suitable reuse cases:** Authoritative server game loop, state machine pattern, network sync protocol, character controller, entity hierarchy, input system, chunk streaming
- **Not suitable for:** Complete game (engine only), character animation system, AI systems

## Technology and runtime
| Component | Technology |
|---|---|
| Rendering | Three.js r166+, custom GLSL shaders |
| Physics | Rapier3D (WASM, via @dimforge/rapier3d-compat) |
| Networking | geckos.io (WebRTC/UDP), Express HTTP |
| Language | TypeScript (full type coverage) |
| Build | Vite |
| Module system | ESM |
| Animation | Three.js AnimationMixer, GLTF/Draco |

## Run and build
```bash
npx @mavonengine/create-bootstrap   # scaffold project
npm run build --workspaces           # build all packages
npm run dev                          # client :5173, server :8050
```

## Architecture map
| Path | Responsibility | Reuse value |
|---|---|---|
| `packages/core/src/BaseGame.ts` | Headless game loop: physics step, world update, tick-based timing | **HIGH** — server-authoritative foundation |
| `packages/core/src/Game.ts` | Client game: canvas, renderer, camera, input, resources, particles | **HIGH** — full client shell |
| `packages/core/src/InputManager.ts` | Keyboard/mouse state tracking, pointer raycasting into world | **HIGH** — reusable input layer |
| `packages/core/src/Networking/Server/Server.ts` | Geckos server, command buffer, state sync, bandwidth/CPU tracking | **HIGH** — authoritative server pattern |
| `packages/core/src/Networking/Client/NetworkManager.ts` | Client socket, command queue with sequence IDs, ping, local replay | **HIGH** — client networking |
| `packages/core/src/World/Actor.ts` | Game object with state stack (EntityState[]), state hash for sync | **HIGH** — state machine pattern |
| `packages/core/src/World/LivingActor.ts` | Actor with health, damage, healing, death check | **HIGH** — health system |
| `packages/core/src/Networking/NetworkedEntity.ts` | Network entity interface: $typeName, updateFromNetwork, field callbacks | **HIGH** — network sync contract |
| `packages/core/src/Networking/syncState.ts` | State stack sync: compare server vs local states, create/replace via factories | **HIGH** — reconciliation pattern |
| `packages/core/src/Networking/Entities/Player.ts` | Player entity: tracked entities, lastProcessedSequenceId, serialization | **HIGH** — player entity template |

## Core implementation recipe
1. **BaseGame** (`packages/core/src/BaseGame.ts:22-135`): Extends EventEmitter. Creates Clock, Scene, Raycaster, BaseWorld. If physics provided, creates KinematicCharacterController with slope limits. Runs `setInterval` tick at configurable rate (default 30). `update()` steps physics, updates world, runs callbacks.
2. **Server** (`packages/core/src/Networking/Server/Server.ts:26-312`): Creates geckos server, Express HTTP, command buffer sorted by sequence ID. `stateSync()` iterates connections, filters entities by distance, emits SV_STATE. Bandwidth/CPU tracking every 5 seconds.
3. **Entity hierarchy** (`Actor.ts`, `LivingActor.ts`, `NetworkedActor.ts`): Each level adds capabilities. Actor adds state stack. LivingActor adds health. NetworkedActor adds network sync. Player adds trackedEntities and sequenceId.
4. **State management** (`Actor.ts`): `state: EntityState[]` is a stack. `syncState.ts` compares incoming server states by index, replaces mismatched states via factories. States implement enter/update/leave/suspend.
5. **Network sync** (`Server.ts`): `stateSync()` checks distance. Only sends entities within range. Entities implement `needsSync` flag. `NetworkedEntity` interface defines `updateFromNetwork(data)`.
6. **Command system** (`Commands.ts`): Clients send `CommandPacket<T>` with auto-incrementing sequenceId. Server sorts by sequence before processing. `lastProcessedSequenceId` sent back for reconciliation.
7. **Character controller** (`BaseGame.ts`): Rapier3D KinematicCharacterController with 0.01 skin width, snap-to-ground (30 units), impulse application to dynamic bodies.

## Key patterns to reuse

### Authoritative Server with Shared Game Loop
- **Where:** `BaseGame.ts:101-124` (tick/update), `Server.ts:136-252` (command buffer + state sync)
- **How:** Server and client extend same BaseGame. Server runs physics without rendering. Commands buffered and sorted by sequence ID before execution.
- **Adaptation:** Override `onCommand()` and `onConnection()`. Set `getStateSyncDistance()` for visibility range.
- **Watch-outs:** Command buffer sorting is O(n log n) per tick.

### State Stack Sync Pattern
- **Where:** `syncState.ts:10-51`, `Actor.ts:13-21`
- **How:** Entity maintains EntityState[] stack. Server sends array. Client compares by index, replaces mismatched via factories. States can suspend previous state.
- **Adaptation:** Create state factories registered by name string.
- **Watch-outs:** State factories must handle `previousState` parameter for data handoff.

### Distance-Based Entity Culling
- **Where:** `Server.ts` stateSync method
- **How:** `player.position.distanceTo(entity.position) < getStateSyncDistance()`. Only sends entities within range. Reduces bandwidth proportional to world size.
- **Adaptation:** Adjust distance function for spherical, rectangular, or zone-based culling.

### Command Sequence Protocol
- **Where:** `Commands.ts`, `Server.ts`, `NetworkManager.ts`
- **How:** Client sends packet with auto-incrementing sequenceId. Server sorts by sequence before processing. Returns lastProcessedSequenceId. Client replays unacknowledged commands.
- **Adaptation:** Add command types for any player action. Implement rollback/replay on mismatch.

## Extension playbook
1. Add ground vehicle: create VehicleActor extending NetworkedActor, add Rapier3D vehicle controller
2. Add AI: create AIActor with behavior tree, run on server headless game loop
3. Add chunk streaming: extend BaseChunkManager with distance-based loading
4. Add HUD: extend Game.ts with 2D overlay layer (HTML/CSS or Pixi.js)

## Limitations and risks
- Early WIP — many features incomplete, APIs may change
- Rapier3D is WASM — requires compatible browser and build setup
- geckos.io uses WebRTC — NAT traversal issues possible
- No character animation system yet
- No AI system yet
- Monorepo structure adds complexity for simple projects

## Verification checklist
- [ ] All packages build without errors
- [ ] Client renders Three.js scene with input
- [ ] Server runs physics headlessly
- [ ] Client connects to server via geckos.io
- [ ] Entity state syncs between server and client
- [ ] Character controller moves with Rapier3D physics
- [ ] Distance culling reduces sent entities
- [ ] Command sequence ordering works correctly

## Evidence
- `packages/core/src/BaseGame.ts` — 135 lines, headless game loop
- `packages/core/src/Game.ts` — 164 lines, client game shell
- `packages/core/src/Networking/Server/Server.ts` — 312 lines, authoritative server
- `packages/core/src/Networking/Client/NetworkManager.ts` — client networking
- `packages/core/src/World/Actor.ts` — 21 lines, state stack pattern
- `packages/core/src/Networking/syncState.ts` — 51 lines, reconciliation
- `packages/core/src/Networking/Entities/Player.ts` — player entity template
