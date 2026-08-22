---
name: threejs-minecraft-voxel-starter
description: Incomplete Minecraft clone starter with Vite, Three.js, voxel toolbar UI, and first-person controls stub
source_repository: AnaMarijaTofilovska/threejs-minecraft-clone
source_url: https://github.com/AnaMarijaTofilovska/threejs-minecraft-clone
project_status: starter
last_inspected: 2026-08-22
---

# threejs-minecraft-clone: reusable implementation skill

## What this skill enables
- Vite + Three.js project scaffolding for browser 3D games
- HTML toolbar UI for block type selection with icon grid
- CSS overlay system for game instructions and status
- First-person control scheme specification (WASD, mouse, sprint, jump)

## Project classification
- **Type:** Starter / incomplete project
- **Evidence:** index.html references `scripts/main.js` which does not exist; only scaffolding present
- **Suitable reuse cases:** Vite + Three.js project setup template, HUD/toolbar UI patterns, CSS overlay patterns
- **Not suitable for:** Voxel engine, terrain generation, block interaction, first-person camera (no implementation)

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js v0.172.0 |
| Language | JavaScript (ES modules) |
| Build tool | Vite 6.0.5 |
| Package manager | npm |

## Run and build
```bash
npm install
npm run dev        # Vite dev server on localhost:3000
npm run build      # Production build
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `index.html` | Game page with toolbar UI (5 block icons + pickaxe), overlay instructions | **High** - HUD/inventory UI template |
| `style.css` | Toolbar styling, overlay positioning, status display | **High** - game UI CSS patterns |
| `vite.config.js` | Vite configuration | Low |
| `scripts/main.js` | **MISSING** - referenced but not in repo | N/A |

## Key patterns to reuse

### Toolbar/Inventory UI
- **Where:** `index.html:12-20`, `style.css:17-43`
- **How:** Fixed bottom toolbar with flexbox grid; 64x64px icons; selection via outline (`.selected` class)
- **Adaptation:** Add more block types, number-key selection, tooltip on hover

### Game Overlay Pattern
- **Where:** `index.html:24-46`, `style.css:54-69`
- **How:** Full-screen fixed overlay with flex centering; hidden on keypress via event listener
- **Adaptation:** Add start/pause states, animate fade transitions

## Extension playbook
1. Implement scene setup in main.js
2. Add first-person pointer lock controls
3. Create voxel chunk system with noise terrain
4. Add block interaction via raycasting

## Limitations and risks
- No game implementation - project is a starter/stub only
- scripts/main.js referenced but missing
- No Three.js setup code exists

## Evidence
- `index.html:47` - References missing scripts/main.js
- `index.html:12-20` - Toolbar HTML structure
- `style.css:17-43` - Toolbar CSS
- `package.json` - Three.js v0.172.0, Vite v6.0.5
