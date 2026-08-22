---
name: openworld-chunk-loading
description: Dynamic chunk-based spatial activation system for large open worlds with multi-LOD priority grid, Cannon.js physics, and first-person player control
source_repository: kohunglee/openworld-js
source_url: https://github.com/kohunglee/openworld-js
project_status: prototype
last_inspected: 2026-08-22
---

# openworld.js: reusable implementation skill

## What this skill enables
- Multi-level chunk loading and unloading based on player proximity and Y-axis offset
- Spatial grid indexing for O(1) object lookups within grid cells
- Dynamic object activation/deactivation with 6 distance-priority levels (DPZ 0-5)
- First-person player controller with pointer lock, WASD movement, sprint, and jump
- Cannon.js physics integration with SAP broadphase and contact materials
- Frame-rate-independent movement speed calculation

## Project classification
- **Type:** prototype
- **Evidence:** Core chunk loading, physics, and player controls are implemented; cyber city demo exists; still has bugs noted in chunkManager comments (line 7)
- **Suitable reuse cases:** Open-world streaming for large city maps, spatial LOD management for GTA-like zones, building/prop activation by player proximity, first-person or third-person player controllers
- **Not suitable for:** Multiplayer networking (none implemented), mission/quest systems, vehicle physics, AI/NPC systems

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js via custom W engine wrapper (`src/wjs/w.js`) |
| Language | JavaScript (ES modules, no TypeScript) |
| Build tool | Vite 7.0.0 |
| Package manager | npm/pnpm |
| Physics | Cannon.js (bundled in `cannon/` directory, SAPBroadphase) |
| Networking | None |
| State management | Global object pattern (`openworld.*`) |
| Audio | None |
| Target platforms | Browser (desktop-focused, WebGL) |

## Run and build
```bash
npm install
npm run dev
npm run build
npm run build:cdn
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `src/openworld.js` | Main entry — merges all modules into single `openworld` object | Low — glue code |
| `src/obj/chunkManager.js` | Dynamic chunk loading/unloading with spatial grid | **High** — core open-world streaming |
| `src/player/control.js` | First-person player control with keyboard/mouse, physics sprint/jump | **High** — reusable FPS controller |
| `src/core/main.js` | Physics world init (Cannon.js), canvas setup, animation loops | **High** — physics bootstrap pattern |
| `src/obj/addobj.js` | Object creation helpers | Medium — factory pattern |
| `src/obj/texture.js` | Texture loading utilities | Low |
| `src/core/animate.js` | Animation frame management | Medium — dual-loop (physics/render) |
| `src/common/hooks.js` | Event hook system for extensibility | **High** — plugin architecture |
| `plugins/webgl/wjsDynamicIns.js` | Dynamic instancing plugin | Medium — instancing pattern |

## Core implementation recipe
1. **Initialize physics world** (`src/core/main.js:28-36`): Create `CANNON.World`, set gravity to `(0, -9.82, 0)`, use `SAPBroadphase`, set solver iterations to 10, add default contact material.
2. **Build spatial grid** (`src/obj/chunkManager.js:34`): Define grid sizes as `[10000, 200, 100, 20, 5, 1]` for DPZ levels 0-5. Each level covers a different spatial resolution for LOD-based activation.
3. **Calculate grid position IDs** (`src/obj/chunkManager.js:11-19`): Convert world (x, z) to grid cell keys using `Math.ceil(x / gridsize)` with direction encoding.
4. **Run spatial activation** (`src/obj/chunkManager.js:41-86`): For each DPZ level, compute the player's 3x3 neighborhood of grid cells. Query the spatial grid for object indices. Filter by Y-axis proximity. Activate newly visible objects, hide previously visible ones.
5. **Wire player movement** (`src/player/control.js:140-192`): Compute frame-rate-independent movement via `speedMult = fps/75`. For sprint, apply CANNON.js velocity directly. For walk, apply math-based position offset using trigonometry with rotation angle.
6. **Run animation loops** (`src/core/main.js:35-36`): Maintain separate physics and render animation loops. Physics loop steps the CANNON world; render loop handles Three.js rendering.

## Key patterns to reuse

### Multi-Level Spatial Grid Activation
- **Where it lives:** `src/obj/chunkManager.js`
- **How it works:** Objects are pre-indexed into a `Map<gridKey, Set<index>>` spatial grid. Each frame, the system computes which grid cells surround the player at each DPZ priority level, collects object indices, and activates/hides them based on distance thresholds including Y-axis filtering.
- **Adaptation recipe:** Replace the manual grid sizing array with configurable LOD distances. Add chunk geometry/material disposal on hide. Integrate with Three.js `Object3D.visible` or frustum culling.
- **Watch-outs:** Current code has acknowledged bugs with direction-based detection (line 7). Y-axis filtering uses `gridsizeY` array which may not suit all terrains. No memory cleanup on hide.

### Dual-Loop Physics/Render Architecture
- **Where it lives:** `src/core/main.js:35-36`
- **How it works:** `animatePhy()` runs Cannon.js `world.step()` at a fixed timestep. `animateRen()` runs Three.js render via `requestAnimationFrame`. Both loops are independent.
- **Adaptation recipe:** Add interpolation between physics steps for smooth rendering. Consider `setAnimationLoop` for modern Three.js patterns.
- **Watch-outs:** No fixed timestep — physics runs as fast as render. May cause instability at low FPS.

### Pointer-Lock FPS Controller
- **Where it lives:** `src/player/control.js:46-94`
- **How it works:** Uses `requestPointerLock` on canvas click. Listens to `keydown`/`keyup` for WASD mapped to movement state flags. Mouse movement via `mousemove` event with `movementX/Y` scaled by 0.1.
- **Adaptation recipe:** Add mouse sensitivity as a configurable variable. Add acceleration/deceleration curves for smoother feel. Add ground detection for jump gating.
- **Watch-outs:** Jump is frame-based (`jumpHoldLimit = 30`), not time-based. Sprint uses raw CANNON velocity without acceleration smoothing.

### Hook-Based Plugin System
- **Where it lives:** `src/common/hooks.js`, used throughout `src/player/control.js`
- **How it works:** `hooks.emit('eventname', ...)` and `hooks.emitSync('eventname', ...)` allow external code to subscribe to game events (jump, mouseMove, forwardBackward, etc.).
- **Adaptation recipe:** Convert to typed EventEmitter or use Three.js EventDispatcher. Add lifecycle hooks (onInit, onUpdate, onDestroy).
- **Watch-outs:** Hooks are stringly-typed — no compile-time safety.

## Assets, configuration, and controls
- **Configuration constants** in `src/core/main.js:4-11`: `speedH`, `speedL`, `speedAdd`, `jumpYVel`, `fov`, `colorClear`, `displayViewTime`
- **Control mapping** in `src/player/control.js:24-40`: keyboard `keyMap` object maps key strings to action names
- **Grid sizes** in `src/obj/chunkManager.js:34`: `gridsize` and `gridsizeY` Uint16Array/Float32Array
- **No external asset pipeline** — assets loaded procedurally or via W engine

## Extension playbook
1. Add NPC AI: Create entity array with update loop, pathfinding against spatial grid
2. Add vehicle physics: Extend CANNON.js with vehicle constraints, integrate into chunk activation
3. Add missions: Create mission state machine, hook into chunk activation events for triggering
4. Add minimap: Read spatial grid data to render player/object positions on 2D canvas
5. Add streaming LOD: Replace hardcoded grid sizes with distance-based geometry/material swapping

## Limitations and risks
- No multiplayer networking — peer-to-peer or server would need to be added
- No asset pipeline for GLTF/OBJ models — uses procedural geometry via W engine
- Chunk manager has acknowledged bugs with direction-based detection
- No TypeScript — no type safety for large-scale development
- Cannon.js is bundled directly rather than via npm — harder to update
- No object pooling for activated/deactivated objects
- Single-threaded — large worlds may cause frame drops

## Verification checklist
- [ ] Chunk loading/unloads correctly as player moves across grid boundaries
- [ ] Y-axis filtering activates correct floor of multi-story buildings
- [ ] Sprint velocity feels smooth and responsive
- [ ] Jump height is consistent across different frame rates
- [ ] Spatial grid lookups complete within 1ms for 100k objects
- [ ] No memory leaks when objects are repeatedly activated/deactivated
- [ ] Physics simulation remains stable during sprint and jump

## Evidence
- `src/obj/chunkManager.js` — 87 lines, DPZ grid system with spatial indexing
- `src/player/control.js` — 254 lines, FPS controller with physics integration
- `src/core/main.js:25-37` — Cannon.js world setup with SAPBroadphase
- `src/openworld.js` — 37 lines, module aggregation pattern
- `package.json` — Vite 7.0.0, zero runtime dependencies (Cannon bundled)
