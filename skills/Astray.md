---
name: threejs-box2d-maze-physics
description: First-person maze game with Box2D physics, procedural maze generation, and smooth camera follow
source_repository: wwwtyro/Astray
source_url: https://github.com/wwwtyro/Astray
project_status: complete-game
last_inspected: 2026-08-22
---

# Astray: reusable implementation skill

## What this skill enables
- Recursive backtracker maze generation algorithm
- Box2D physics integration with Three.js rendering
- Smooth third-person camera follow with lerp
- Level progression with increasing maze difficulty
- Merged geometry for efficient maze rendering
- Fade-in/fade-out state transitions

## Project classification
- **Type:** Complete game (maze puzzle)
- **Suitable reuse cases:** Maze/interior generation for GTA-like buildings, Box2D physics for 2D physics, procedural level generation, camera follow pattern, state machine for game flow
- **Not suitable for:** Open-world terrain, shooting mechanics, networking, character animation

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js (r66, bundled locally) |
| Language | Vanilla JavaScript (inline in HTML) |
| Build tool | None (static files) |
| Physics | Box2dWeb (2D, bundled) |

## Run and build
```bash
python -m http.server
# Open localhost:8000
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `index.html` | Complete game: scene, physics, rendering, game loop, state machine | **High** |
| `maze.js` | Recursive backtracker maze generation | **High** |
| `Box2dWeb.min.js` | Box2D physics engine (bundled) | Medium |

## Core implementation recipe
1. **Maze generation** (`maze.js:1-43`): Recursive backtracker: init N x N grid as walls; start at (1,1); randomly choose unvisited cell 2 steps away; carve path; recurse.
2. **Physics world** (`index.html:46-75`): Zero gravity (top-down), dynamic ball body (circle radius 0.25), static box bodies for maze walls.
3. **Merged geometry** (`index.html:78-95`): Create CubeGeometry for each wall, merge into single THREE.Geometry; one material, one draw call.
4. **Physics forces** (`index.html:138-152`): Each frame: multiply velocity by 0.95 (friction); apply impulse from keyboard input; step world at 1/60 with 8 iterations.
5. **Render sync** (`index.html:155-181`): Copy ball position from Box2D to Three.js mesh; compute rotation from position delta; lerp camera at 0.1 factor; move light with camera.
6. **State machine** (`index.html:184-240`): 'initialize' creates maze/physics/render; 'fade in' increases light; 'play' runs physics+render; 'fade out' decreases light; victory at maze exit.

## Key patterns to reuse

### Recursive Backtracker Maze
- **Where:** `maze.js:1-43`
- **How:** Init grid as walls; carve from (1,1) by choosing random unvisited cells 2 steps away; recurse until stuck.
- **Adaptation:** Change dimension; add bias for longer corridors; generate rooms with corridors

### Merged Geometry Rendering
- **Where:** `index.html:78-95`
- **How:** Individual CubeGeometry meshes merged into single THREE.Geometry; one material = one draw call.
- **Adaptation:** Modern approach uses BufferGeometryUtils.mergeBufferGeometries

### Smooth Camera Follow
- **Where:** `index.html:174-177`
- **How:** `camera.position += (target - camera.position) * 0.1` exponential lerp.
- **Adaptation:** Adjust lerp factor; add look-at offset

## Extension playbook
1. Add room generation: modify maze to create open rooms connected by corridors
2. Add collectibles: place objects at random positions, detect overlap
3. Add 3D maze: extrude walls to full height, add first-person camera

## Limitations and risks
- Three.js r66 extremely outdated (2013-era)
- Box2D is 2D only
- No module system - everything inline in HTML
- No audio, no save/load

## Evidence
- `maze.js:1-43` - Recursive backtracker algorithm
- `index.html:46-75` - Box2D world with ball and maze walls
- `index.html:78-95` - Merged geometry rendering
- `index.html:138-152` - Physics update with friction and impulse
- `index.html:184-240` - State machine with fade transitions
