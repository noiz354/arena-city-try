# Skill Library — GTA-Like Game Project

All agent skills available in this repository, organized by tier/source. Load the
matching skill before implementing each system (see `MASTER_PROMPT.md` for the
7-phase build workflow).

---

## 1. Core Skills (12) — distilled from reference repos

Flat `.md` knowledge files distilled from 12 open-source Three.js repos. These are
the primary skills referenced by the master prompt.

| Skill file | Covers | Load when building |
|---|---|---|
| `Langenium.md` | Aircraft physics, missile combat, NPC vision/pursue AI, chase camera, YUKA steering | vehicles, combat, NPC AI |
| `bloodwave-fps-game.md` | FPS weapons (4 guns), raycast shooting, enemy AI + pathfinding, wave spawning, HUD, Web Audio | shooting, HUD, enemy waves |
| `SYNTHBLAST-threejs-game.md` | Projectile pooling, destructible buildings, homing AI, camera toggle, drone, power-ups | destruction, enemy AI, cameras |
| `openworld-js.md` | Chunk loading (DPZ spatial grid), Cannon.js physics, FPS controller, hooks | open-world streaming, spatial LOD |
| `mavonengine-core.md` | Authoritative server, state machines, WebRTC multiplayer, entity hierarchy, Rapier3D | multiplayer, server architecture |
| `interstellar-armada.md` | Newtonian physics, weapon cooldowns, object pooling, AI pilots, missions | physics, weapons, AI, missions |
| `3d-game.md` | Cannon.js physics, third-person camera w/ wall clipping, socket.io sync | multiplayer sync, camera |
| `racing.md` | Vehicle physics, chase camera, track collision, checkpoints, CPU AI | car driving, racing |
| `Edelweiss.md` | 3rd-person camera w/ wall avoidance, character controller (climb/glide), stamina | on-foot traversal, stamina |
| `Multiplayer-Browser-FPS.md` | ECS architecture, hitscan, AABB collision, level editor, Socket.IO | ECS, level editor |
| `threejs-minecraft-clone.md` | Vite + Three.js scaffold, toolbar UI, CSS overlays | starting new project |
| `Astray.md` | Maze generation, merged geometry, smooth camera, state machine | interiors, procedural rooms |

Supporting code lives in `reference/` (93 files from the same 12 repos).

---

## 2. Community Skill Packs (34) — downloaded from GitHub

Claude Code / Codex compatible skills (folder + `SKILL.md` format) plus knowledge
files, downloaded for this project.

### 2a. `community/threejs-game-skills/` — 9 skills
**Source:** [majidmanzarpour/threejs-game-skills](https://github.com/majidmanzarpour/threejs-game-skills) (MIT)

End-to-end Three.js game building system with a director that routes the specialists.

| Skill | Description |
|---|---|
| `threejs-game-director` | **Main entrypoint** — orchestrates the whole build: phase playbook, skill routing, ledgers, audit. Load this first. |
| `threejs-gameplay-systems` | Playable loop, architecture, game/level design, mechanics, entities, controls, camera, physics selection, game feel (hitstop, screenshake, easing). Includes Vite+TS+Three.js scaffold. |
| `threejs-aaa-graphics-builder` | Upgrade visuals from prototype to AAA: art direction, PBR materials, lighting, shaders, environment, postprocessing. |
| `threejs-game-ui-designer` | HUDs, menus, overlays, pause/win/lose screens, settings, icon/button systems. |
| `threejs-debug-profiler` | Scene debug, render/runtime/loading/animation profiling, memory + perf checks. |
| `threejs-qa-release` | Playtest QA, bot playtests, mobile/responsive checks, release verification gates. |
| `threejs-3d-generator` | AI 3D asset generation (Tripo API) — models, vehicles, buildings, weapons, textures. |
| `threejs-image-generator` | AI 2D asset generation (Gemini API) — concept art, textures, skies, icons, menu art. |
| `threejs-audio-generator` | AI audio (ElevenLabs API) — SFX, ambience, UI sounds, dialogue, manifests. |

### 2b. `community/threejs-foundations/` — 10 skills
**Source:** [CloudAI-X/threejs-skills](https://github.com/CloudAI-X/threejs-skills) (MIT)

Foundational Three.js API reference skills — accurate API signatures + working patterns.

| Skill | Description |
|---|---|
| `threejs-fundamentals` | Scene setup, cameras, renderer, Object3D hierarchy, coordinate systems |
| `threejs-geometry` | Built-in shapes, BufferGeometry, custom geometry, **instancing** |
| `threejs-materials` | PBR, basic/phong/standard, shader materials |
| `threejs-lighting` | Light types, shadows, environment lighting |
| `threejs-textures` | Texture types, UV mapping, environment maps, render targets |
| `threejs-animation` | Keyframe, skeletal animation, morph targets, animation mixing |
| `threejs-loaders` | GLTF/GLB loading, texture loading, async patterns, caching |
| `threejs-shaders` | GLSL basics, ShaderMaterial, uniforms, custom effects |
| `threejs-postprocessing` | EffectComposer, bloom, DOF, screen effects, custom passes |
| `threejs-interaction` | Raycasting, camera controls, mouse/touch input, object selection |

### 2c. `community/ok-skills/threejs-master/` — 1 skill
**Source:** [byosamah/ok-skills](https://github.com/byosamah/ok-skills) (MIT)

`threejs-master` — the definitive production-grade Three.js game-building skill
(modern r170+, ES module import maps): scene setup, lighting, materials, animation,
GLTF loading, game architecture, collision, input, audio, UI overlays, performance
optimization. (Other ok-skills — cloning, designmd-ripper, branded-design,
tony-fadell, gauntlet-loop — were skipped as not game-relevant.)

### 2d. `community/threejs-ecs-ts/` — 46 knowledge files (28 .md + docs)
**Source:** [Nice-Wolf-Studio/claude-skills-threejs-ecs-ts](https://github.com/Nice-Wolf-Studio/claude-skills-threejs-ecs-ts) (MIT)

Reference guides for Entity-Component-System architecture + Three.js + TypeScript
game development. React/R3F category excluded (this project uses plain Three.js).

| Category | Files | Covers |
|---|---|---|
| `ecs/` (7) | architecture, system-patterns, component-patterns, queries, events, serialization, performance | Full ECS implementation patterns |
| `game-systems/` (11) | ai-system, audio-system, camera-system, collision-system, health-combat-system, input-system, inventory-system, level-system, physics-system, spawn-system, ui-system | Ready-made system designs |
| `threejs/` (21) | animation-systems, best-practices, camera-controls, environment-maps, fog, materials, model-loading, optimization, post-processing, rendering, scene-setup, shadows, textures, geometry… | Three.js deep-dive guides |
| `mobile/` (4) | performance, battery-optimization, memory-management, touch-input | Mobile/touch support |
| `typescript/` (3) | type-safe game dev patterns | TypeScript strict-mode patterns |

### 2e. `community/threejs-awesome-graphics/` — 24 skills
**Source:** [scottstts/Threejs-Awesome-Graphics-Agent-Skills](https://github.com/scottstts/Threejs-Awesome-Graphics-Agent-Skills)

A Three.js graphics-excellence skill pack (mesh design, lighting, PBR materials,
textures, shaders, TSL/WebGPU, GLSL, post-processing, realism, stylization,
particles, procedural visuals, color management, tone mapping). Ships each skill
with a `SKILL.md` + `references/` + runnable `examples/` + `assets/`, and a router
(`threejs-skill-router`) that decomposes a visual target into the right experts.
The `dev/` example-gallery mirror was skipped to stay under the snapshot budget —
all example source already lives inside `skills/*/examples/`.

| Skill | Expertise |
|---|---|
| `threejs-skill-router` | Decompose a visual target into the smallest relevant expert systems. **Load first.** |
| `threejs-camera-direction` | Authored lenses/shots, chase/side/orbit rigs, pointer look, floating origins |
| `threejs-procedural-animation` | Analytic timelines, gravity turns, springs, quaternion alignment, debris motion |
| `threejs-procedural-fields` | Shared scalar/vector fields, frequency bands, domain warping, procedural normals |
| `threejs-procedural-materials` | Hybrid texture-backed PBR, atlas filtering, terrain wetness, lava/emissive, raytraced gems, dispersive glass |
| `threejs-parallax-occlusion-mapping` | TSL height marching, relief shells, self-shadowing |
| `threejs-procedural-geometry` | Polygon modeling, loft/revolve/sweep, crafted assemblies, defect audits |
| `threejs-procedural-vegetation` | Growth hierarchies, ivy, GPU grass, flower fields, foliage normals, wind |
| `threejs-procedural-architecture` | Massing/façade grammars, module compilation |
| `threejs-procedural-planets` | Spherical terrain, ridges, craters, biomes, altitude filtering |
| `threejs-spectral-ocean` | Validated FFT synthesis, hybrid FFT/Gerstner water, caustics, Jacobian foam |
| `threejs-water-optics` | Shared analytic waves/normals, pool heightfields, ripples, refraction |
| `threejs-precipitation-surfaces` | Snow/rain accumulation, snow caps, wet puddles, ripple normals |
| `threejs-atmosphere-aerial-perspective` | Rayleigh/Mie atmosphere, sky, depth-based scattering |
| `threejs-volumetric-clouds` | Weather-shaped density, raymarching, cloud lighting/shadows |
| `threejs-raymarched-space-effects` | Black holes, accretion disks, wormholes, lensed star fields |
| `threejs-procedural-vfx` | Aurora curtains, WebGPU fire/smoke, reentry shells, sparks, dissolving debris |
| `threejs-temporal-surfaces` | Frost, wet-window droplets, refraction, blur |
| `threejs-shadow-systems` | Stable cascades, cached clipmap shadows |
| `threejs-screen-space-ambient-occlusion` | GTAO, bent normals, bilateral/temporal reconstruction |
| `threejs-bloom` | HDR extraction, multi-scale filtering, selective contribution |
| `threejs-exposure-color-grading` | Luminance metering, tone mapping, generated 3D LUT |
| `threejs-image-pipeline` | Render-signal ownership/ordering across image-space systems |
| `threejs-visual-validation` | Fixed-view captures, diagnostic mosaics, seed sweeps, GPU evidence |

---

## How to use

1. **Project phase work** → load the matching Core skill from section 1 (they map
   directly to the 7 phases in `MASTER_PROMPT.md`).
2. **Complete game build / iteration** → load `community/threejs-game-skills/threejs-game-director/SKILL.md`;
   it routes to the other threejs-game-skills specialists.
3. **Three.js API questions** (materials, loaders, postprocessing, …) → load the
   matching `community/threejs-foundations/*/SKILL.md`.
4. **Deep architecture questions** (ECS, systems, perf) → read the
   `community/threejs-ecs-ts/` guides.
5. **Full production-grade patterns** → load `community/ok-skills/threejs-master/SKILL.md`.
6. **"Awesome graphics" upgrade** (sky/ocean/clouds/vegetation/PBR/post-FX) →
   load `community/threejs-awesome-graphics/skills/threejs-skill-router/SKILL.md`;
   it routes to the other 23 experts.

Each pack keeps its own `README.md` + `LICENSE` (all MIT).
