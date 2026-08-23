---
title: CITY RUSH — Implementation Wiki
description: Developer wiki for the CITY RUSH Three.js open-world browser game — architecture, systems, and contribution guides.
---

# CITY RUSH — Implementation Wiki

CITY RUSH is an open-world browser game built with **TypeScript + Vite + Three.js**.
It ships a chunk-streamed procedural city, ambient traffic and pedestrians, a
wanted/police loop, missions, save/load, mobile touch controls, and automatic
quality scaling — all client-only, with no physics engine (hand-rolled collision)
and seeded `mulberry32` determinism behind world generation.

The codebase is small by design: one entry point (`src/main.ts`), an orchestrator
(`src/game/Game.ts`) driving a strict per-frame update order over **27 systems**
under `src/systems/`, a scene assembler (`src/game/World.ts`), two entities
(`Player`, `Vehicle`), and static data tables under `src/data/`.

## Wiki Map

### 🚦 Getting Started

Role-based onramps and practical reference material:

- [Contributor Guide](/getting-started/onboarding/contributor-guide) — zero to first PR in a Three.js codebase, with TypeScript↔Python comparisons
- [Staff Engineer Guide](/getting-started/onboarding/staff-engineer-guide) — the one architectural insight: lazy build-once chunks behind a fixed update order
- [Executive Guide](/getting-started/onboarding/executive-guide) — capability, risk & investment view
- [Product Manager Guide](/getting-started/onboarding/product-manager-guide) — the player journey without the jargon
- [Project Overview & Architecture](/getting-started/overview) · [Dev Setup](/getting-started/setup) · [Controls & Modes](/getting-started/usage) · [Debug Console Quick Reference](/getting-started/quick-reference)

### 🔬 Deep Dive

Architecture → subsystems → components, every claim anchored to `file:line` citations:

| Cluster | Covers |
| --- | --- |
| [Core Loop & Entities](/deep-dive/core-loop/game-loop) | Bootstrap order, per-frame update sequence, Player/Vehicle state machines |
| [World Generation](/deep-dive/world-generation/chunk-manager) | LOD rings, build-once chunk cache, seeded layout rules, 24k grass blades |
| [Rendering & Post-FX](/deep-dive/rendering-postfx/postfx) | EffectComposer chain, color grading, auto quality, particles, camera rig |
| [Environment & Weather](/deep-dive/environment/day-night-system) | Sun-direction contract, weather machine, wet surfaces |
| [Gameplay Core & AI](/deep-dive/gameplay-core/mode-controller) | Mode switching, pedestrians, wanted stars, enemy LOS/combat |
| [Vehicles & Traffic](/deep-dive/vehicles-traffic/vehicle-manager) | Fleet management, AI driving (and its documented turn-RNG quirk) |
| [Combat, Missions & Pickups](/deep-dive/combat-missions/weapon-system) | Hitscan weapons, 4-mission graph, pickup economy |
| [UI, Audio, Persistence & Support](/deep-dive/ui-audio-support/minimap-system) | Minimap projection, audio pooling, saves, touch input, collider overlay |

### 📚 Reference Imports — Addy Osmani Workflow

13 whole clones (`repos/<slug>/`, 37-1265 file, `.git` ada) via **Audit → Pattern classify → Scaffold (Vite/Yeoman) → PRPL Measure → Document**. Setiap halaman kutip `repos/<slug>/file:line` (keep `arena-city-try/main` per `wiki/catalogue.json:5`); stub `gta-game-toolkit/reference/` dibiarkan read-only:

| Repo | Wiki | Addy patterns | Load when |
| --- | --- | --- | --- |
| Langenium | [Overview](/reference/langenium) · [Aircraft](/reference/langenium/aircraft) · [Actors](/reference/langenium/actors) · [Scanners](/reference/langenium/scanners-weapons) · [Missiles](/reference/langenium/missiles-camera) | Observer / State / Strategy | vehicles, dogfight, chase cam |
| bloodwave-fps-game | [Overview](/reference/bloodwave-fps-game) · [Shooting](/reference/bloodwave-fps-game/shooting) · [Enemies](/reference/bloodwave-fps-game/enemies-waves) · [Scene/HUD](/reference/bloodwave-fps-game/scene-hud-audio) | Module / PubSub | weapons, waves, HUD |
| SYNTHBLAST | [Overview](/reference/synthblast) · [Gun](/reference/synthblast/gun-bullet) · [Enemy/Drone](/reference/synthblast/enemy-drone) · [Level](/reference/synthblast/level-building) | Factory/Pool / Strategy | destruction, drone |
| openworld-js | [Overview](/reference/openworld-js) · [Chunks](/reference/openworld-js/chunk-manager) · [Hooks](/reference/openworld-js/core-hooks) | Facade / Mediator | streaming, hooks |
| mavonengine-core | [Overview](/reference/mavonengine-core) · [BaseGame](/reference/mavonengine-core/base-game) · [Actors](/reference/mavonengine-core/actors) · [Network](/reference/mavonengine-core/networking) | Command / State | multiplayer, sync |
| interstellar-armada | [Overview](/reference/interstellar-armada) · [Physics](/reference/interstellar-armada/physics-equipment) · [AI](/reference/interstellar-armada/ai-pools) | Strategy / Pool | Newtonian physics, AI pilots |
| 3d-game (alias) | [Overview](/reference/3d-game) · [Camera](/reference/3d-game/camera-scene) · [Physics/Net](/reference/3d-game/physics-network) | Observer / Strategy | camera, socket sync |
| racing | [Overview](/reference/racing) · [Vehicle](/reference/racing/vehicle-player) · [Track/CPU](/reference/racing/track-cpu) · [Scene](/reference/racing/scene-config) | Data-driven / Strategy | drivable cars, CPU traffic |
| Edelweiss | [Overview](/reference/edelweiss) · [Controller](/reference/edelweiss/controller) · [Camera](/reference/edelweiss/camera-stamina) · [Streaming](/reference/edelweiss/streaming) | Controller / Optimizer | stamina, GLB streaming |
| Multiplayer-Browser-FPS | [Overview](/reference/multiplayer-browser-fps) · [ECS](/reference/multiplayer-browser-fps/ecs-update) · [Utils](/reference/multiplayer-browser-fps/utils) · [Editor](/reference/multiplayer-browser-fps/network-editor) | ECS / Mediator | ECS, level editor |
| threejs-minecraft-clone | [Scaffold](/reference/threejs-minecraft-clone) | Scaffold (Yeoman) | project start |
| Astray | [Maze](/reference/astray) | Generator / State | maze, interiors |
| 3D_racing_game (extra) | [Variant](/reference/3D_racing_game) | Data-driven / Strategy | racing variant (evanbillet) |

See [`wiki/catalogue.json` Reference Imports](/reference) dan `repos/<slug>/` whole clone (`D:/Downloads/22-8-26-threejs/repos/`). `MASTER_PROMPT.md:346-464` roster 93-file tetap jadi jejak `reference/` stub.

## Where to Start

1. New to the repo → read the [Contributor Guide](/getting-started/onboarding/contributor-guide).
2. Want the mental model in ten minutes → [Staff Engineer Guide](/getting-started/onboarding/staff-engineer-guide), then [Game Loop](/deep-dive/core-loop/game-loop).
3. Debugging live gameplay → [Quick Reference](/getting-started/quick-reference) for `window.game` QA hooks.

Mermaid diagrams render in dark mode — click any diagram for a zoomed view.
