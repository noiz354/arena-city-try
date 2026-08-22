---
name: synthblast-tank-shooter-systems
description: Retro-futuristic tank shooter with gun/projectile system, destructible buildings, enemy AI with homing, camera toggle between first-person and overhead, and particle death effects
source_repository: brianrisk/SYNTHBLAST-threejs-game
source_url: https://github.com/brianrisk/SYNTHBLAST-threejs-game
project_status: complete-game
last_inspected: 2026-08-22
---

# SYNTHBLAST: reusable implementation skill

## What this skill enables
- Projectile-based gun system with bullet pooling, fire rate cooldown, and ammo management
- Destructible building system with height-based damage and animated collapse
- Enemy AI with homing pursuit toward player's predicted position
- Camera perspective toggle between first-person and overhead with smooth transition
- Particle explosion effect on enemy death
- Drone companion AI with formation following, hover behavior, and smooth steering
- Power-up system (shields, pads, coins) with magnetic pickup and visual feedback
- Level generation with grid-based procedural placement of buildings, enemies, pads, and shields

## Project classification
- **Type:** complete-game (shipped retro-futuristic tank game)
- **Suitable reuse cases:** Projectile pooling, building destruction, enemy homing AI, camera mode switching, drone companion AI, grid-based level generation, power-up pickup systems
- **Not suitable for:** FPS raycast shooting (uses projectile bullets), open world streaming, multiplayer, realistic physics

## Technology and runtime
| Area | Actual implementation |
| --- | --- |
| Renderer / framework | Three.js r185 + pixi.js v8.19 (2D UI overlay) |
| Language | JavaScript (ES modules) |
| Build tool | Vite 8.x |
| Package manager | npm |
| Physics / networking / state / audio | Custom AABB collision, no physics engine, no networking, HTML5 Audio API |
| Target platforms | Web browser (desktop + mobile touch) |

## Run and build
```bash
npm ci
npm run dev      # Vite dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Architecture map
| Path | Responsibility | Reuse value |
| --- | --- | --- |
| `js/classes/Gun.js` | Gun system: fire rate, bullet spawning, ammo check, sound trigger | **VERY HIGH** - reusable projectile weapon |
| `js/classes/Bullet.js` | Bullet: projectile with velocity, lifetime deactivation, pooling reset | **VERY HIGH** - bullet pooling pattern |
| `js/classes/Enemy.js` | Enemy AI: homing pursuit toward player future position, wandering, death particles | **VERY HIGH** - homing enemy AI |
| `js/classes/Building.js` | Destructible building: height-based HP, animated collapse | **HIGH** - destructible environment |
| `js/classes/Hero.js` | Player: movement, perspective toggle (FPS/overhead), shield, ammo, health | **HIGH** - player controller with camera modes |
| `js/classes/Drone.js` | Drone companion: formation follow, hover, smooth steering with acceleration | **HIGH** - companion AI |
| `js/classes/Level.js` | Level generator: grid-based placement, collision, post-processing, win condition | **HIGH** - procedural level layout |
| `js/classes/Particle.js` | Death explosion: random velocity cones with auto-cleanup | **MEDIUM** - particle death effect |
| `js/classes/powerups/Shield.js` | Shield power-up: magnetic attraction, point-sphere mesh, additive blending | **MEDIUM** - magnetic pickup pattern |
| `js/classes/powerups/Pad.js` | Collectible pad: cone mesh, scale-down animation on pickup | **MEDIUM** - collectible pattern |

## Core implementation recipe
1. **Projectile system** (`js/classes/Bullet.js:1-73`): Bullet with size, position, direction, scene. Velocity = direction x 0.4 x fpsAdjustment. Auto-deactivates after 1 second. Pool: check isActive() for reuse, reset() repositions.
2. **Gun firing** (`js/classes/Gun.js:23-72`): Checks recharge cooldown (150ms). Creates Bullet at hero position + direction. Max 50 bullets, reuse inactive. Plays sound on fire.
3. **Enemy homing AI** (`js/classes/Enemy.js:81-108`): Calculates heroDistance x hero.speed x 6 for prediction. Gets futurePositionWithDistance. Computes angle, rotates direction by angle/25 x fpsAdjustment per frame.
4. **Building destruction** (`js/classes/Building.js:30-39`): hit(impact) reduces height and hitPoints. When height <= 0.001, building inactive. update() animates Z toward desiredZ for collapse.
5. **Perspective toggle** (`js/classes/Hero.js:154-174`): changePerspective() flips between bottomZ (0.5, FPS) and topZ (15, overhead). Camera height transitions via perspectiveSpeed.
6. **Level generation** (`js/classes/Level.js:86-124`): Grid-based with randomInt() probability checks. Each cell: building (1/30), enemy (1/64), pad (1/160), shield (1/100). Arena scales with level.
7. **Drone formation** (`js/classes/Drone.js:120-186`): Formation point behind hero. smoothstep for speed ramping. turnToward() applies clamped turn speed with acceleration/deceleration.

## Key patterns to reuse

### Bullet Pooling
- **Where:** `js/classes/Bullet.js:59-70`, `js/classes/Gun.js:48-72`
- **How:** Gun maintains bullets[] array. If < 50, create new. Else find inactive and reset(). Bullets auto-deactivate after 1s.
- **Adaptation:** Set max pool size. Add isActive()/reset(direction, position) to projectile.

### Homing Enemy AI with Prediction
- **Where:** `js/classes/Enemy.js:81-108`
- **How:** Calculates where player will be based on speed/direction. Rotates enemy toward prediction at angle/25 rate. Creates natural pursuit curves.
- **Adaptation:** Replace prediction function. Adjust turn rate divisor (25 = smooth, lower = sharper).

### Camera Perspective Toggle
- **Where:** `js/classes/Hero.js:154-174, 181-218`
- **How:** Two modes: FPS (z=0.5, tilted down) and overhead (z=15, looking down). Smooth interpolation via headTiltDelta and perspectiveHeight.
- **Adaptation:** Define two camera configs, toggle with smooth interpolation.

### Magnetic Pickup Pattern
- **Where:** `js/classes/powerups/Shield.js:48-53`, `js/classes/Level.js:434-455`
- **How:** Within magnet radius (5): move toward player at 0.1 x fpsAdjustment. Within pickup radius (0.7): consume.
- **Adaptation:** Two radii: magnet (pull) and collect (consume). Normalize delta, multiply by speed.

## Assets, configuration, and controls
- **Input:** Arrow keys/WASD (move), Space (fire), P (perspective toggle), Touch controls for mobile
- **Audio:** HTML5 Audio for pew, hit, explosion, impact, flip, shield, launch, energy, ammoEmpty, point
- **Post-processing:** Custom GlitchPass for screen distortion on player damage

## Extension playbook
1. Add weapon types: extend Gun class with damage, bullet speed, spread, fire rate
2. Add destructible props: copy Building pattern with height-based HP
3. Add enemy types: subclasses with different homing rates, speeds, HP
4. Add score/upgrade system: track kills, offer upgrades between levels

## Limitations and risks
- No TypeScript — all JavaScript
- Physics is pure AABB distance checks — entities can overlap
- Drone loads JSON model asynchronously — race condition possible
- Pixi.js and Three.js share same canvas context

## Verification checklist
- [ ] npm run dev starts without errors
- [ ] Hero moves and rotates correctly
- [ ] Space fires bullets that travel and deactivate after 1s
- [ ] Enemies home toward predicted position
- [ ] Buildings can be destroyed with collapse animation
- [ ] Perspective toggle switches smoothly
- [ ] Shield power-ups magnetically attract
- [ ] Point pads register collection
- [ ] Drone follows hero in formation
- [ ] Particle explosions on enemy death

## Evidence
- `js/classes/Gun.js` — 76 lines, projectile weapon with pooling
- `js/classes/Bullet.js` — 73 lines, pooled bullet
- `js/classes/Enemy.js` — 145 lines, homing AI
- `js/classes/Building.js` — 67 lines, destructible environment
- `js/classes/Hero.js` — 299 lines, player controller
- `js/classes/Drone.js` — 256 lines, formation-following AI
- `js/classes/Level.js` — 490 lines, level generator
- `js/classes/Particle.js` — 39 lines, death explosion
- `js/classes/powerups/Shield.js` — 56 lines, magnetic pickup
