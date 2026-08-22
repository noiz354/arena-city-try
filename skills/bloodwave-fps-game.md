---
name: bloodwave-fps-weapon-enemy-systems
description: Wave survival FPS with 4-weapon inventory, procedural terrain, zombie AI with pathfinding, raycast shooting with viewmodel, and full HUD system in Three.js
source_repository: imr4n4lif/bloodwave-fps-game
source_url: https://github.com/imr4n4lif/bloodwave-fps-game
project_status: complete-game
last_inspected: 2026-08-22
---

# BLOODWAVE FPS: reusable implementation skill

## What this skill enables
- Multi-weapon inventory system with per-weapon stats (damage, fire rate, spread, recoil, magazine, reload)
- FPS player controller with WASD movement, mouse look, jump, sprint, gravity, collision detection
- Enemy AI system: spawn waves, chase player, attack in range, procedural box-model zombies with animation
- Raycast-based shooting with enemy hit detection, environment bullet holes, muzzle flash, tracers
- Wave progression manager with difficulty scaling and ammo drop system
- Full HUD: health bar, ammo display, kill feed, damage vignette, hit indicators, wave announcements
- Web Audio API sound manager with per-event volume control and graceful missing-file fallback

## Project classification
- **Type:** complete-game (polished wave survival FPS)
- **Suitable reuse cases:** FPS weapon system with multiple gun types, enemy AI chase/attack behavior, wave-based spawning, HUD overlay system, raycast shooting with visual feedback
- **Not suitable for:** Vehicle driving, open world streaming, multiplayer, third-person camera, inventory management

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js r128 (CDN, no bundler) |
| Language | JavaScript (ES modules) |
| Build tool | None (static files, ES module imports) |
| Package manager | None (CDN only) |
| Physics / networking / state / audio | Custom AABB collision, raycast shooting, Web Audio API, no networking |
| Target platforms | Web browser (desktop, requires pointer lock) |

## Run and build
```bash
# Serve from project root (ES modules require HTTP server)
python -m http.server 8080
# No build step, no install step — zero dependencies
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `js/shooting.js` | Weapon system: 4 guns, viewmodel, raycast, muzzle flash, tracers, reload, bullet holes | **VERY HIGH** - complete FPS weapon system |
| `js/enemies.js` | Zombie AI: spawn, chase, attack, procedural model, animation, health bars, death | **VERY HIGH** - enemy AI + procedural character |
| `js/player.js` | FPS controller: mouse look, WASD, jump, sprint, gravity, collision, head bob | **VERY HIGH** - complete FPS movement controller |
| `js/scene.js` | World: procedural terrain, buildings, trees (instanced), rocks, lighting, sky | **HIGH** - open world terrain generation |
| `js/waves.js` | Wave manager: 8+ configs, difficulty scaling, ammo pack drops | **HIGH** - wave-based game loop |
| `js/hud.js` | HUD: health bar, damage vignette, kill feed, score, hit indicators, wave UI | **HIGH** - overlay UI system |
| `js/audio.js` | Sound manager: Web Audio API, per-event volume, graceful fallback | **MEDIUM** - audio system |
| `js/main.js` | Game loop: init, start/pause/restart, system wiring | **MEDIUM** - game lifecycle |

## Core implementation recipe
1. **Weapon definition** (`js/shooting.js:11-81`): WEAPONS object maps weapon keys to stat objects: name, damage, magSize, reserveMax, reloadTime, fireRate, auto, spread, recoilPitch, recoilGun, colors, basePos.
2. **Viewmodel rendering** (`js/shooting.js:102-115`): Separate THREE.Scene + PerspectiveCamera for weapon overlay. Weapon models from Box/Cylinder geometry. `renderWeapon()` called after main scene with `clearDepth()`.
3. **Raycast shooting** (`js/shooting.js:344-403`): Camera position/direction with spread randomization, `enemySystem.raycastEnemies()` for enemy hit or `_envRaycast()` for environment.
4. **Enemy AI** (`js/enemies.js:231-271`): Calculate direction to player, apply yaw rotation, gravity, move if > ATTACK_RANGE, resolve AABB collisions, attack when in range.
5. **Enemy raycasting** (`js/enemies.js:385-409`): Custom sphere-ray intersection against all alive enemies. Returns closest hit with contact point.
6. **Wave progression** (`js/waves.js:100-193`): Wave config array defines count/hp/speed/spawnRadius. WaveManager tracks kills, spawns ammo packs, scales difficulty.

## Key patterns to reuse

### Data-Driven Weapon Definitions
- **Where:** `js/shooting.js:11-81`
- **How:** Single WEAPONS object defines all weapon stats as plain data. Adding a weapon = adding one object.
- **Adaptation:** Extend with new properties (projectileType, explosionRadius). Add `_build_<key>()` methods.
- **Watch-outs:** Each weapon needs a model builder method. basePos controls viewmodel positioning.

### Separate Viewmodel Rendering
- **Where:** `js/shooting.js:102-115, 588-591`
- **How:** Weapon scene with own camera parented to player camera. Main scene renders first, then clearDepth() + render(weaponScene, weaponCamera).
- **Watch-outs:** clearDepth() is critical. Weapon camera FOV must match player camera.

### Procedural Box-Model Characters
- **Where:** `js/enemies.js:42-211`
- **How:** Zombies from BoxGeometry primitives (body, head, limbs, eyes, teeth). Shared geometry/materials reused. Variation via random skin tint offsetHSL.
- **Adaptation:** Create character builder functions returning THREE.Group. Use shared geometry for performance.

### AABB Collision Resolution
- **Where:** `js/player.js:159-183` and `js/enemies.js:273-292`
- **How:** For each collidable AABB: check overlap X, Z, Y. Push out along shortest overlap axis. Zero velocity on pushed axis.

### Wave-Based Difficulty Scaling
- **Where:** `js/waves.js:7-16, 118-128`
- **How:** 8 predefined wave configs. Beyond wave 8, linear extrapolation adds 7 enemies, 40 HP, 0.4 speed per wave with cap at 11.

## Assets, configuration, and controls
- **Input:** WASD, Mouse, LMB (shoot), RMB (ADS), R (reload), Shift (sprint), Space, 1-4 (weapon switch)
- **Weapons:** M4 (30 mag, full-auto), MP5 (40 mag, fast), SPAS-12 (8 mag, 6 pellets), AWP (5 mag, high damage)
- **Audio:** 16 sound events mapped to .wav files in `sounds/`

## Extension playbook
1. Add weapons: entry to WEAPONS object + `_build_<key>()` method
2. Add enemy types: different geometry builders, HP, speed, attack patterns
3. Add pickups: extend AmmoPack pattern with distance check
4. Add terrain: use _addBuilding()/_addTower() patterns with collision boxes

## Limitations and risks
- Three.js loaded from CDN at r128 — not upgradeable without API changes
- All collision is AABB — no sloped surfaces
- Enemy AI is purely chase — no pathfinding around obstacles
- No save/load system
- Hardcoded world size (300x300) with boundary walls

## Verification checklist
- [ ] Game loads without errors
- [ ] All 4 weapons fire, reload, switch correctly
- [ ] Enemies spawn in waves and chase player
- [ ] Health bar updates and damage vignette shows on hit
- [ ] Ammo packs spawn and restore ammo
- [ ] Wave progression advances after clearing enemies

## Evidence
- `js/shooting.js` — 608 lines, complete weapon system
- `js/enemies.js` — 418 lines, full enemy AI + procedural model
- `js/player.js` — 220 lines, complete FPS controller
- `js/scene.js` — 397 lines, procedural world generation
- `js/waves.js` — 232 lines, wave manager
- `js/hud.js` — 93 lines, overlay HUD
- `js/audio.js` — 132 lines, Web Audio API sound manager
