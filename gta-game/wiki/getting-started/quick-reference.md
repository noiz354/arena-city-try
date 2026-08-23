---
title: "Quick Reference — Debug Console & QA Entry Points"
description: "One-page cheat sheet of the window.game QA hooks — colliderDebug.toggle(), wanted.reportCrime(), modeCtrl, vehicles.getNearest(), and the renderer.info measurement trick."
---

# Quick Reference — Debug Console & QA Entry Points

## The `window.game` Surface

Boot exposes the entire `Game` instance as `window.game`, plus the analytics tracker as `window.tracker` ([`src/main.ts:78-79`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L78-L79)). Every subsystem field on `Game` is public readonly ([`src/game/Game.ts:52-82`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L52-L82)), so the console can reach anything the game itself can.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
graph LR
    WG["window.game (Game)"] --> CD["colliderDebug<br>.toggle() .enabled"]
    WG --> WN["wanted<br>.reportCrime(sev, pos) .stars"]
    WG --> MODE["modeCtrl<br>.mode .vehicle .activePosition"]
    WG --> VEH["vehicles + traffic<br>.getNearest(x, z)"]
    WG --> REN["renderer.info<br>calls / triangles / memory"]
    WG --> MISC["player.position/health,<br>world.chunks.activeCount,<br>postfx.enabled, audio.muted,<br>missions.profile, saveManager"]
    WT["window.tracker"] --> ANA["analytics queue<br>.track() .flush()"]
```

<!-- Sources: src/main.ts:78-79, src/game/Game.ts:52-96 -->

## Primary QA Hooks

| Hook | What it does | Returns / notes | Source |
|---|---|---|---|
| `game.colliderDebug.toggle()` | Flips the green wireframe overlay for every active collidable; also bound to **F3** | New boolean state | [`src/systems/ColliderDebug.ts:29-35`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L29-L35), keybind at [`src/game/Game.ts:401`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L401) |
| `game.wanted.reportCrime(3, {x: 0, z: 0})` | Feeds a crime severity into star math (`+severity − 1` stars) | Stars mutate; telemetry fires on change | [`src/systems/WantedSystem.ts:30`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/WantedSystem.ts#L30) |
| `game.modeCtrl` | Live mode state machine object (`mode` `'foot' \| 'driving'`, `vehicle`, `activePosition/Yaw`) | Inspect freely; prefer F3/E over mutating | [`src/game/Game.ts:82`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L82), [`src/systems/ModeController.ts:62-70`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L62-L70) |
| `game.vehicles.getNearest(x, z)` | Nearest enterable parked car within 3.6 m (squared `ENTER_DIST² = 12.96`) | `Vehicle \| null` — wrap in backtick-safe console typing as written | [`src/systems/VehicleManager.ts:52-66`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/VehicleManager.ts#L52-L66) |
| `game.traffic.getNearest(x, z)` | Same for hijackable AI traffic cars | `Vehicle \| null` | [`src/systems/TrafficSystem.ts:84`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/TrafficSystem.ts#L84) |

```js
// canonical E2E snippets (as catalogued in docs/wiki/index.md "Runtime Debug Console")
window.game.colliderDebug.toggle()
window.game.wanted.reportCrime(3, { x: 0, z: 0 })
window.game.modeCtrl            // inspect mode state machine
window.game.vehicles.getNearest(0, 0)
```

**Known quirk to expect:** `reportCrime(3)` from a clean record yields **2 stars**, not 3+, because the math is `+severity − 1` — flagged in [`docs/wiki/index.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/index.md) and confirmed at [`src/game/Game.ts:299`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L299) where cop kills report severity 3.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    A["reportCrime(severity, playerPos)"] --> B["stars += severity - 1"]
    B --> C{"stars changed?"}
    C -- yes --> D["telemetry wanted_changed fires"]
    C -- no --> E["no event"]
    D --> F{"cop within spawn ring?"}
    F -- "yes, per cadence" --> G["cop spawns road-snapped 50-80 m away"]
    F -- no --> H["decay timer continues"]
```

<!-- Sources: src/systems/WantedSystem.ts:30, src/game/Game.ts:436-439, docs/wiki/systems/WantedSystem.md -->

## Measuring Draw Calls Correctly

With post-processing enabled, `renderer.info.render.calls` reads as **1** because `EffectComposer` wraps the whole frame into one draw when `autoReset` is true — a documented runtime observation ([`docs/wiki/systems/PostFX.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/PostFX.md)). The QA recipe: disable auto-reset, let frames accumulate, then divide by the number of composer renders (the composer issues two internal render passes per frame).

```js
// baseline metrics recipe from tests/E2E_CHROME_DEVTOOLS.md
const g = window.game
g.renderer.info.autoReset = false          // accumulate instead of auto-clearing
// ...run one frame...
const calls = g.renderer.info.render.calls / 2   // composer = 2 renderer passes per frame
g.renderer.info.autoReset = true           // restore default behavior
({
  drawCalls: calls,
  triangles: g.renderer.info.render.triangles,
  geometries: g.renderer.info.memory.geometries,
  textures: g.renderer.info.memory.textures,
  chunksActive: g.world.chunks.activeCount,
  dpr: g.renderer.getPixelRatio(),
})
```

Sources: [`tests/E2E_CHROME_DEVTOOLS.md:65-82`](https://github.com/noiz354/arena-city-try/blob/main/tests/E2E_CHROME_DEVTOOLS.md#L65-L82), [`tests/E2E_CHROME_DEVTOOLS.md:241`](https://github.com/noiz354/arena-city-try/blob/main/tests/E2E_CHROME_DEVTOOLS.md#L241), [`docs/wiki/systems/PostFX.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/PostFX.md)

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart LR
    A["Read info.render.calls"] --> B{"postfx.enabled?"}
    B -- yes --> C["reads 1 - composer wraps frame"]
    C --> D["autoReset = false, sample N frames"]
    D --> E["divide accumulated calls by 2N"]
    B -- no --> F["raw renderer.render - calls are real"]
    E --> G["Comparable draw-call metric"]
    F --> G
```

<!-- Sources: tests/E2E_CHROME_DEVTOOLS.md:65-82, docs/wiki/systems/PostFX.md -->

## Driving The Game From Scripted Input

`InputManager` listens on `window`, so synthetic keyboard events work for automated checks — dispatch with the correct `code` and hold via timing:

```js
(async () => {
  const t = performance.now()
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }))
  await new Promise(r => setTimeout(r, 1000))
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }))
  const p = window.game.player.position
  return { movedXZ: [p.x, p.z], hp: window.game.player.health }
})()
// position must change > 1 m after a 1 s walk; y stays ~0.95
```

Source: [`tests/E2E_CHROME_DEVTOOLS.md:84-100`](https://github.com/noiz354/arena-city-try/blob/main/tests/E2E_CHROME_DEVTOOLS.md#L84-L100). Codes the game actually listens for are tabulated in [`docs/wiki/utils-and-data.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/utils-and-data.md); edge-triggered reads are consumed per frame by `endFrame()` ([`src/utils/InputManager.ts:169-174`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L169-L174)), so each synthetic press needs its matching release.

## Boot & Health Checks

| Check | Snippet | Source |
|---|---|---|
| Loading screen gone, canvas present | `!document.getElementById('loading') && !!document.querySelector('canvas')` | [`tests/E2E_CHROME_DEVTOOLS.md:56-61`](https://github.com/noiz354/arena-city-try/blob/main/tests/E2E_CHROME_DEVTOOLS.md#L56-L61), overlay removal in [`src/main.ts:21-26`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L21-L26) |
| Boot failure telemetry | Fatal path tracks `boot_failed` before rethrowing | [`src/main.ts:31-45`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L31-L45) |
| Global error capture | `initErrorHandling` installs handlers first thing in boot | [`src/main.ts:10-14`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L10-L14) |
| Analytics flush on exit | `pagehide` triggers `tracker.flush(true)` | [`src/main.ts:72`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L72) |

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant QA as Devtools console
    participant G as window.game
    participant CDB as colliderDebug
    participant UPD as Game.update loop
    QA->>G: game.colliderDebug.toggle()
    G->>CDB: toggle()
    CDB-->>QA: returns true, root.visible = true
    UPD->>CDB: update(dt, allCollidables) every frame
    CDB->>CDB: throttle 0.25 s -> rebuild Box3Helpers
    QA->>G: toggle() again
    CDB-->>QA: returns false, helpers cleared
```

<!-- Sources: src/systems/ColliderDebug.ts:29-53, src/game/Game.ts:400-402, src/main.ts:78 -->

Full behavior details: [ColliderDebug — F3 Overlay & Box3Helper Rebuild](../deep-dive/ui-audio-support/collider-debug.md).

## Caveats

- There is **no** `window.game.debugColliders()` function despite a stale source comment claiming one — the working path is `window.game.colliderDebug.toggle()` ([`src/systems/ColliderDebug.ts:10`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L10) vs reality; finding logged in [`docs/wiki/systems/ColliderDebug.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/ColliderDebug.md)).
- Breaking the public `window.game` debug API is prohibited by [AGENTS.md](https://github.com/noiz354/arena-city-try/blob/main/AGENTS.md).
- Telemetry has no runtime opt-out; it transmits only if built with `VITE_ANALYTICS_ENDPOINT` set ([`docs/wiki/utils-and-data.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/utils-and-data.md)).

## Related Pages

| Page | Relationship |
|------|-------------|
| [Running & Playing CITY RUSH](./usage.md) | Manual equivalents of these hooks |
| [Dev Setup & Build](./setup.md) | Serving the app you are about to poke |
| [ColliderDebug — F3 Overlay](../deep-dive/ui-audio-support/collider-debug.md) | Deep dive on the overlay behind `toggle()` |
| [Project Overview & Architecture](./overview.md) | How `Game` fields map onto systems |
