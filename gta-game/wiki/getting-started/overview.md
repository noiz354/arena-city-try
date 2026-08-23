---
title: "Project Overview & Architecture at a Glance"
description: "What CITY RUSH is, how it boots, and how its source tree is layered — entry flow from main.ts through the Game orchestrator to the 27 systems."
---

# Project Overview & Architecture at a Glance

## What CITY RUSH Is — and Why It Looks Like This

CITY RUSH is a **client-only open-world browser game**: an infinite-feeling seeded city with traffic, pedestrians, combat, a wanted system, missions, saves, mobile touch controls and automatic quality scaling — all in **TypeScript + Vite + [three](https://www.npmjs.com/package/three)**, with no backend and no physics engine. Every collision is hand-rolled against axis-aligned bounding boxes ([`src/game/World.ts:22-24`](https://github.com/noiz354/arena-city-try/blob/main/src/game/World.ts#L22-L24)), every sound is synthesized at runtime from oscillators (no audio assets), and world layout is deterministic via a seeded mulberry32 PRNG ([`src/systems/CityGenerator.ts:34`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L34)).

The architecture follows one rule: **everything that has exactly one instance lives in `Game`; everything that can be extracted into a single-file system does.** The result is one orchestrator class plus 27 single-purpose system files under `src/systems/`.

| Layer | Responsibility | Key file | Source |
|---|---|---|---|
| Boot | Error handling first, then game creation, HUD/telemetry wiring, loop start | [`src/main.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts) | [`src/main.ts:9-14`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L9-L14) |
| Orchestration | Renderer/camera/scene ownership, per-frame update order, pause, autosave | [`src/game/Game.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts) | [`src/game/Game.ts:45-50`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L45-L50) |
| World assembly | Scene grafting, ground/terrain/lights/sky, shadow frustum | [`src/game/World.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/game/World.ts) | [`src/game/World.ts:38-48`](https://github.com/noiz354/arena-city-try/blob/main/src/game/World.ts#L38-L48) |
| Entities | Player and Vehicle physics/state machines | [`src/entities/`](https://github.com/noiz354/arena-city-try/blob/main/src/entities) | [`src/entities/Player.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/entities/Player.ts) |
| Systems | 27 single-file gameplay/render/support systems | [`src/systems/`](https://github.com/noiz354/arena-city-try/blob/main/src/systems) | [`src/game/Game.ts:13-37`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L13-L37) |
| UI / Data / Utils / Analytics | HUD + pause menu, static tables, input/raycast/logger helpers, telemetry | [`src/ui/`](https://github.com/noiz354/arena-city-try/blob/main/src/ui), [`src/data/`](https://github.com/noiz354/arena-city-try/blob/main/src/data), [`src/utils/`](https://github.com/noiz354/arena-city-try/blob/main/src/utils), [`src/analytics/`](https://github.com/noiz354/arena-city-try/blob/main/src/analytics) | [`src/main.ts:1-7`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L1-L7) |

## Boot Flow: From Empty Page to First Frame

The entry point is declared in [`index.html:16`](https://github.com/noiz354/arena-city-try/blob/main/index.html#L16) as `/src/main.ts`. Boot order is deliberate: **global error handling installs before anything else** so even constructor crashes are caught and reported ([`src/utils/errors.ts`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/errors.ts)), then `new Game(...)` runs inside try/catch with a friendly fatal screen fallback, then frame callbacks are registered, and only then does `game.start()` spin up the loop.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    A["index.html loads main.ts"] --> B["initErrorHandling + Tracker"]
    B --> C["new Game(container)<br>constructor wires all systems"]
    C --> D{"constructor threw?"}
    D -- yes --> E["Fatal screen + boot_failed event"]
    D -- no --> F["onUpdate callbacks registered<br>telemetry + HUD"]
    F --> G["game.start()"]
    G --> H["requestAnimationFrame loop"]
    H --> I["Loading overlay fades out"]
```

<!-- Sources: index.html:16, src/main.ts:9-79, src/utils/errors.ts -->

Inside the `Game` constructor, **creation order matters because later systems consume earlier ones as constructor arguments** — `ModeController` alone receives 13 dependencies last of all:

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
graph TB
    subgraph CORE["Foundation"]
        R["WebGLRenderer"] --> CAM["PerspectiveCamera(60)"]
        CAM --> INP["InputManager.attach()"]
        INP --> W["World"]
    end
    subgraph POLISH["Atmosphere"]
        W --> AUD["AudioManager"]
        W --> PFX["PostFX composer chain"]
        W --> AQ["AutoQuality"]
        W --> DN["DayNightSystem"]
        DN --> WS["WeatherSystem"]
    end
    subgraph LIFE["Simulation actors"]
        P["Player at spawn (0, 0.95, 0)"] --> WM["VehicleManager"]
        WM --> EN["EnemySystem"] --> PED["PedestrianSystem"] --> TR["TrafficSystem"] --> WANT["WantedSystem"]
    end
    subgraph META["Meta layer"]
        EN --> MS["MissionSystem"] --> MM["MinimapSystem"]
        MS --> SM["SaveManager"] --> PM["PauseMenu"]
        MS --> WPNS["WeaponSystem"] --> PK["PickupSystem"]
        PK --> LOAD["loadSave() restores localStorage"]
    end
    META --> MC["ModeController (last, gets everything)"]
```

<!-- Sources: src/game/Game.ts:120-338, src/systems/CityGenerator.ts, docs/wiki/game-loop.md -->

For the full annotated constructor walkthrough see [Game Bootstrap & the Per-Frame Update Loop](../deep-dive/core-loop/game-loop.md).

## The Runtime Layer Map

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
graph LR
    subgraph ENTRY["Entry"]
        M["main.ts"]
    end
    subgraph GAME["src/game"]
        G["Game.ts orchestrator"]
        WD["World.ts scene builder"]
    end
    subgraph ENT["src/entities"]
        PL["Player"]
        VH["Vehicle"]
    end
    subgraph SYS["src/systems (27 files)"]
        direction TB
        S1["ChunkManager / CityGenerator / Vegetation"]
        S2["PostFX / ColorGrade / AutoQuality / ParticleSystem / CameraRig"]
        S3["DayNight / Weather / WetSurface / Sky"]
        S4["ModeController / Enemy / Pedestrian / Traffic / Wanted"]
        S5["Mission / Weapon / WeaponView / Pickup / VehicleManager"]
        S6["Minimap / Audio / Save / MobileControls / ColliderDebug"]
    end
    subgraph SUPPORT["Support"]
        UI["ui/ hud + pauseMenu + style.css"]
        DATA["data/ missions vehicles weapons"]
        UTILS["utils/ InputManager raycast texel logger errors"]
        ANA["analytics/ tracker gameTelemetry"]
    end
    M --> G
    G --> WD
    G --> ENT
    G --> SYS
    G --> SUPPORT
```

<!-- Sources: src/game/Game.ts:1-40 imports, docs/wiki/index.md cluster tables -->

## One Frame, End to End

The loop is plain `requestAnimationFrame` — not `setAnimationLoop` — re-queued **first** each tick so a slow frame never delays scheduling the next one. Delta time is clamped to 0.05 s so tab-back hitches cannot teleport entities. When paused, update *and* render are skipped entirely; only `input.endFrame()` still runs.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant RAF as requestAnimationFrame
    participant L as Game.loop()
    participant U as Game.update(delta)
    participant CB as onUpdate callbacks (HUD)
    participant R as Renderer / Composer
    RAF->>L: invoke tick
    L->>RAF: re-queue next frame FIRST
    L->>L: delta = min(clock.getDelta(), 0.05)
    L->>U: if not paused
    U->>U: audio listener, chunks, dayNight, AI, player, minimap, autosave...
    L->>CB: flush telemetry.frame() + hud.update(delta, game)
    CB->>R: applyShake -> render -> restoreShake
    L->>L: input.endFrame() clears edges
```

<!-- Sources: src/game/Game.ts:372-383, src/game/Game.ts:385-467, src/main.ts:47-55 -->

The 33-step update sequence has one consequence worth internalizing early: enemies, pedestrians and traffic all run **before** `modeCtrl.update`, so they see the previous frame's player position; the HUD runs in step 32, after all simulation, so it always sees fully-updated state ([`src/game/Game.ts:385-467`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L385-L467)).

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TB
    subgraph SIM["Simulation (sees last-frame player)"]
        A["audio.setListener"] --> B["world.update chunk streaming"]
        B --> C["dayNight + updateSun"]
        C --> D["vehicles / collidable lists / colliderDebug"]
        D --> E["enemies -> pedestrians -> traffic -> pickups -> weapons"]
    end
    subgraph PLAYER["Player slot (step 15)"]
        F["modeCtrl.update: movement, driving, enter/exit, death"]
    end
    subgraph META2["Meta + polish"]
        G2["wanted (foot only)"] --> H2["missions + minimap"]
        H2 --> I2["autosave every 30 s"]
        I2 --> J2["weather, vegetation, wet, particles, explosions, engine audio"]
    end
    subgraph OUT["Output"]
        K["exposure, postfx shake, AutoQuality"] --> L2["HUD callbacks (step 32)"] --> M2["render"]
    end
    SIM --> PLAYER --> META2 --> OUT
```

<!-- Sources: src/game/Game.ts:385-467, docs/wiki/game-loop.md update order table -->

## City Metrics Every System Shares

These constants are imported everywhere — memorize them once:

| Constant | Value | Meaning | Source |
|---|---|---|---|
| `CELL` | 40 m | Block pitch = block + road (`BLOCK_SIZE=30` + `ROAD_WIDTH=10`) | [`src/systems/CityGenerator.ts:4-6`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L4-L6) |
| `CITY_SIZE` / `CITY_HALF` | 310 m / 155 m | Playable city extent on each axis | [`src/systems/CityGenerator.ts:8-9`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L8-L9) |
| `CHUNK_SIZE` | 16 m | Streaming granularity for the build-once chunk cache | [`src/systems/CityGenerator.ts:10`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L10) |
| Landmark tower | (20, 20), 72 m tall | Deliberately off-origin so spawn roads stay clear (BUG-001/002 history) | [`src/systems/CityGenerator.ts:22-25`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/CityGenerator.ts#L22-L25) |
| Spawn point | `(SPAWN_X, 0.95, SPAWN_Z)` = `(0, 0.95, 0)` | Player Y is fixed at 0.95 m, also used by save restore | [`src/game/Game.ts:182`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L182) |

## Where To Go Next

| You want to... | Read this |
|---|---|
| Install, build, typecheck | [Dev Setup & Build](./setup.md) |
| Actually play it | [Running & Playing CITY RUSH](./usage.md) |
| Debug from the console | [Quick Reference — Debug Console & QA Entry Points](./quick-reference.md) |
| Understand the frame loop in full | [Game Bootstrap & the Per-Frame Update Loop](../deep-dive/core-loop/game-loop.md) |
| Know every subsystem's tuning constants | Start at the implementation wiki: [`docs/wiki/index.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/index.md) |

## Known Doc-vs-Code Findings

Carried from [`docs/wiki/index.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/index.md) — treat these as accepted quirks unless you are fixing them: `heal()` has zero callers; observed walk speed exceeds the coded `WALK_SPEED = 5.5`; `reportCrime(3)` from 0 stars yields 2 stars; traffic turn RNG never picks right turns; the wet-surface shared ripple material defeats per-ripple opacity writes; `ColorGrade`'s docstring promises effects the linear-contrast code does not implement.

## Related Pages

| Page | Relationship |
|------|-------------|
| [Dev Setup & Build](./setup.md) | Toolchain and commands for this codebase |
| [Running & Playing CITY RUSH](./usage.md) | Player-facing behavior of what is described here |
| [Quick Reference — Debug Console](./quick-reference.md) | The `window.game` surface installed by `main.ts` |
| [Game Bootstrap & the Per-Frame Update Loop](../deep-dive/core-loop/game-loop.md) | Line-by-line expansion of the boot/frame sections above |
| [Entities — Player & Vehicle Physics](../deep-dive/core-loop/entities.md) | The entity layer referenced throughout |
