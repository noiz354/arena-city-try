---
title: "ColliderDebug — F3 Overlay & Box3Helper Rebuild"
description: "The F3-toggled diagnostic overlay: green Box3Helper wireframes for every active collidable, throttled to one full rebuild per 0.25 seconds."
---

# ColliderDebug — F3 Overlay & Box3Helper Rebuild

## Why It Exists

ColliderDebug renders a green wireframe `Box3Helper` for every currently active collidable — static buildings plus live vehicles — making invisible physics volumes visible; the Three.js equivalent of Unity Gizmos / Godot collision-shape display ([`src/systems/ColliderDebug.ts:6-15`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L6-L15)). It is explicitly documented in-source as "a DIAGNOSTIC aid, not a gameplay system": off by default, and rebuilt on a short throttle rather than every frame.

It also exposes the codebase's central collision truth: there are **no collider categories, layers or masks anywhere** — the shared `Collidable { box: Box3 }` contract is the entire currency, and "which colliders exist" is decided purely by which arrays the caller concatenates ([`src/game/World.ts:22-24`](https://github.com/noiz354/arena-city-try/blob/main/src/game/World.ts#L22-L24)).

## Toggle & Rebuild Mechanics

The constructor only sets `root.visible = false`; Game must add the root Group to the scene ([`src/game/Game.ts:175-176`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L175-L176)). Two toggling paths converge on the same method:

| Path | Mechanism | Source |
|---|---|---|
| Keyboard | F3 checked each frame via `input.wasPressed('F3')` | [`src/game/Game.ts:400-401`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L400-L401) |
| Console | `window.game.colliderDebug.toggle()` (exposed via `main.ts`) | [`src/main.ts:78`](https://github.com/noiz354/arena-city-try/blob/main/src/main.ts#L78), [`src/game/Game.ts:74`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L74) |

`toggle()` flips `enabled`, mirrors it onto `root.visible`, clears all helpers when disabling, and resets `timer = 0` when enabling so the **first refresh happens on the very next frame** instead of waiting a throttle period; it returns the new state ([`src/systems/ColliderDebug.ts:29-35`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L29-L35)).

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant QA as Devtools / F3
    participant CDB as ColliderDebug
    participant UPD as Game.update
    participant LST as allCollidables list
    QA->>CDB: toggle()
    CDB-->>QA: true - timer reset to 0
    UPD->>LST: buildings + vehicles concat
    UPD->>CDB: update(dt, collidables)
    CDB->>CDB: enabled? yes -> countdown
    CDB->>CDB: rebuild: dispose ALL helpers,<br>new Box3Helper per entry
    Note over CDB: repeats at most once per 0.25 s
    QA->>CDB: toggle() again
    CDB->>CDB: clear() removes + disposes helpers
```

<!-- Sources: src/systems/ColliderDebug.ts:29-53, src/game/Game.ts:397-402 -->

## The 0.25 s Throttle Trade-off

Per frame, `update(dt, collidables)` early-outs unless enabled, counts down `timer`, and returns while `timer > 0` — rebuilding at most once per `REFRESH_INTERVAL = 0.25` s (up to 4 rebuilds/second) ([`src/systems/ColliderDebug.ts:4`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L4), [`src/systems/ColliderDebug.ts:38-44`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L38-L44)).

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    A["update(dt, collidables)"] --> B{"enabled?"}
    B -- no --> OUT["early return"]
    B -- yes --> C["timer -= dt"]
    C --> D{"timer > 0?"}
    D -- yes --> OUT
    D -- no --> E["timer = REFRESH_INTERVAL 0.25 s"]
    E --> F["clear(): remove helpers,<br>dispose geometry + material each"]
    F --> G["rebuild: new Box3Helper(c.box, 0x00ff88)<br>per collidable entry"]
```

<!-- Sources: src/systems/ColliderDebug.ts:38-62 -->

Each helper holds a live reference to its source `Box3`, so moving vehicle boxes would track between refreshes via Box3Helper's own matrix update — but the periodic full rebuild is what picks up **set membership changes** (vehicles entering/leaving visibility). The trade-off: fresh geometry/material allocation per helper up to 4×/second is fine at current collider counts (~tens), but a persistent-pool variant is the obvious upgrade if the active list grows into hundreds ([`docs/wiki/systems/ColliderDebug.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/ColliderDebug.md)).

## Data Sources: What Shows Up In The Overlay

Game feeds it the same concatenated list weapons and traffic use, built fresh each frame:

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
graph LR
    subgraph WORLD["World"]
        CH["ChunkManager active-chunk collidables<br>static buildings"]
    end
    subgraph VEH["Vehicles"]
        VM["VehicleManager.getCollidables()<br>visible parked vehicles"]
    end
    CAT["concat -> allCollidables"] --> CDI["colliderDebug.update(delta, allCollidables)"]
    CH --> CAT
    VM --> CAT
    CDI --> OV["Green wireframes in scene<br>only while root.visible"]
```

<!-- Sources: src/game/Game.ts:397-402, docs/wiki/systems/ColliderDebug.md -->

Upstream producers: ChunkManager's active-chunk rebuild supplies building boxes and VehicleManager contributes per-vehicle footprint boxes ([`docs/wiki/systems/ChunkManager.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/ChunkManager.md), [`src/systems/VehicleManager.ts:69-75`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/VehicleManager.ts#L69-L75)).

## Public API

| Member | Type | Behavior | Source |
|---|---|---|---|
| `enabled` | boolean (public field) | Current state | [`src/systems/ColliderDebug.ts:18`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L18) |
| `root` | Group (readonly) | Helper container; visibility-synced to `enabled`; added to scene by Game | [`src/systems/ColliderDebug.ts:17`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L17) |
| `toggle()` | method | Flip state, return new state; immediate refresh on enable, full clear on disable | [`src/systems/ColliderDebug.ts:29-35`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L29-L35) |
| `update(dt, collidables)` | method | Throttled re-sync against the caller's active list | [`src/systems/ColliderDebug.ts:38`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L38) |
| `dispose()` | method | Release helper GPU resources; called from `Game.destroy()` | [`src/systems/ColliderDebug.ts:64-66`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L64-L66), [`src/game/Game.ts:363`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L363) |

Internal state is minimal: one shared green `Color(0x00ff88)`, the helpers array, and the throttle countdown ([`src/systems/ColliderDebug.ts:20-22`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L20-L22)).

## Tuning & Extension Points

| Knob | Value / approach | Notes | Source |
|---|---|---|---|
| `REFRESH_INTERVAL` | 0.25 s — the only constant | Lower for snappier vehicle-box tracking; raise to cut rebuild churn on weak machines | [`src/systems/ColliderDebug.ts:4`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L4) |
| Overlay color | `0x00ff88` single shared green | Per-source colors (buildings vs vehicles vs traffic) would require tagging Collidable entries or passing separate lists | [`src/systems/ColliderDebug.ts:20`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L20) |
| State-aware UI | `toggle()` returns the new state | A keybind HUD or debug menu can reflect it directly | [`src/systems/ColliderDebug.ts:29`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L29) |

## Known Doc-vs-Code Finding

A stale in-file comment claims the system is toggled "with F3 (or `window.game.debugColliders()` from the console)" ([`src/systems/ColliderDebug.ts:10`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ColliderDebug.ts#L10)) — **no `debugColliders` symbol exists anywhere in src/**. The working console path is `window.game.colliderDebug.toggle()`. This finding is catalogued in [`docs/wiki/systems/ColliderDebug.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/ColliderDebug.md); preserve it when editing either file.

## Related Pages

| Page | Relationship |
|------|-------------|
| [Quick Reference — Debug Console](../../getting-started/quick-reference.md) | The console workflow that drives `toggle()` |
| [MinimapSystem](./minimap-system.md) | Sibling diagnostic/overlay consumer of per-frame Game updates |
| [SaveManager](./save-manager.md) | Both disposed from `Game.destroy()` |
| [Game Bootstrap & the Per-Frame Update Loop](../core-loop/game-loop.md) | Where steps 7's collidable-list assembly happens |

