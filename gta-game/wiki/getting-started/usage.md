---
title: "Running & Playing CITY RUSH (Controls & Modes)"
description: "Keyboard, mouse and touch bindings, foot-vs-vehicle mode switching, the pause menu, missions and wanted stars — all traced to InputManager consumers in source."
---

# Running & Playing CITY RUSH (Controls & Modes)

## How Input Reaches The Game

There is **no binding table or action-name abstraction**: gameplay code queries raw `KeyboardEvent.code` strings directly through `InputManager` — `isDown('KeyW')`, `wasPressed('Escape')` ([`src/utils/InputManager.ts:93-95`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L93-L95)). Keyboard/mouse listeners attach to `window` (mousedown to the canvas container only), edge-triggered presses are cleared each frame by `endFrame()`, and pause calls `clearTransient()` so no stale click fires after resume ([`src/utils/InputManager.ts:169-182`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L169-L182)). On phones, [MobileControls](../deep-dive/ui-audio-support/mobile-controls.md) injects *virtual* keys into this same API, so touch and keyboard are indistinguishable downstream.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart LR
    subgraph SOURCES["Input sources"]
        KB["Keyboard keydown/keyup on window"]
        MS["Mouse move/down/wheel"]
        TC["Touch joystick + buttons, coarse-pointer devices"]
    end
    subgraph IM["InputManager accumulators"]
        K["keys + pressed sets"]
        V["virtualKeys + virtualPressed sets"]
        MD["mouseDelta + clickQueued"]
    end
    subgraph CONSUMERS["Per-frame consumers"]
        MC["ModeController: drive/steer, E interact, 1-4 weapons, R reload"]
        PL["Player: WASD, Shift sprint, Space jump"]
        WS2["WeaponSystem: fire via isMouseDown/consumeClick"]
        GM["Game: Escape pause, F3 collider view, KeyM mute"]
        CR["CameraRig: mouseDelta orbit"]
    end
    KB --> K
    MS --> MD
    TC --> V
    TC --> MD
    K --> CONSUMERS
    V --> CONSUMERS
    MD --> CONSUMERS
    CONSUMERS --> EF["input.endFrame() resets edges every frame"]
```

<!-- Sources: src/utils/InputManager.ts:6-19,70-78,143-174, src/systems/MobileControls.ts:83-91 -->

## Complete Binding Table

Every binding below was located at its actual query site in source:

| Code(s) | Action | Context | Source |
|---|---|---|---|
| `KeyW` / `KeyS` | Move forward/back; vehicle throttle | Foot / driving | [`src/entities/Player.ts:136`](https://github.com/noiz354/arena-city-try/blob/main/src/entities/Player.ts#L136); [`src/systems/ModeController.ts:151`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L151) |
| `KeyA` / `KeyD` | Strafe left/right; steering | Foot / driving | [`src/entities/Player.ts:135`](https://github.com/noiz354/arena-city-try/blob/main/src/entities/Player.ts#L135); [`src/systems/ModeController.ts:152`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L152) |
| `ShiftLeft` / `ShiftRight` | Sprint | Foot only | [`src/entities/Player.ts:150`](https://github.com/noiz354/arena-city-try/blob/main/src/entities/Player.ts#L150) |
| `Space` | Jump when grounded | Foot only | [`src/entities/Player.ts:172`](https://github.com/noiz354/arena-city-try/blob/main/src/entities/Player.ts#L172) |
| `KeyE` | Start mission in zone, else enter/exit nearest vehicle | Interact | [`src/systems/ModeController.ts:115-126`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L115-L126) |
| `Digit1`..`Digit4` | Switch weapon by `WeaponDef.key` | Foot only | [`src/systems/ModeController.ts:93-98`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L93-L98) |
| `KeyR` | Reload | Foot only | [`src/systems/ModeController.ts:99`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L99) |
| Left mouse | Fire: click = semi-auto shot, hold = automatic weapons | Foot only | [`src/utils/InputManager.ts:132-141`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L132-L141) |
| Mouse drag | Orbit camera; press+release under 8 px counts as click instead | Both modes | [`src/utils/InputManager.ts:61`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L61) |
| `Escape` | Toggle pause menu | Global | [`src/game/Game.ts:378`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L378) |
| `F3` | Toggle collider wireframe overlay | Debug | [`src/game/Game.ts:401`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L401) |
| `KeyM` | Mute/unmute audio | Global | [`src/game/Game.ts:490`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L490) |

Note the deliberate priority in `KeyE`: standing in a mission start zone consumes E for the mission, so it cannot simultaneously enter a car ([`src/systems/ModeController.ts:114-127`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L114-L127)).

## Modes: On Foot vs Driving

The whole player experience hangs off a two-state machine owned by `ModeController`. While driving, the minimap tracks the car instead of the hidden player, the weapon viewmodel hides, and the engine drone pitches with speed.

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
stateDiagram-v2
    [*] --> Foot
    Foot --> Driving : KeyE near visible non-wrecked vehicle
    Driving --> Foot : KeyE exit, or vehicle wrecked
    Foot --> Dead : health reaches 0
    Dead --> Foot : respawn timer elapses
```

<!-- Sources: src/systems/ModeController.ts:49-70,115-144, docs/wiki/systems/ModeController.md -->

Enter thresholds: parked cars are found via `VehicleManager.getNearest(x,z)` falling back to `TrafficSystem.getNearest(x,z)` for hijacking traffic; the parked-fleet threshold is squared distance `ENTER_DIST² = 12.96` (**3.6 m**), skipping invisible or wrecked vehicles ([`src/systems/VehicleManager.ts:52-66`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/VehicleManager.ts#L52-L66); fallback chain at [`src/systems/ModeController.ts:121-123`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L121-L123)).

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant P as Player presses KeyE
    participant MC as ModeController foot update
    participant VM as VehicleManager.getNearest
    participant TR as TrafficSystem.getNearest
    participant V as Vehicle
    P->>MC: wasPressed KeyE
    MC->>MC: missions.zoneAt(player)? yes -> startMission, stop
    MC->>VM: query parked fleet within 3.6 m
    VM-->>MC: nearest parked Vehicle or null
    alt no parked car found
        MC->>TR: query traffic cars
        TR-->>MC: nearest hijackable Vehicle or null
    end
    MC->>V: enterVehicle(v) - mode becomes driving
    V->>V: camera rig switches, engine audio starts
```

<!-- Sources: src/systems/ModeController.ts:114-133, src/systems/VehicleManager.ts:52-66, src/game/Game.ts:483-491 -->

## Pause Menu

`Escape` flips `Game.setPaused`, which shows/hides the overlay and clears transient input. When paused, **update and render both stop** — nothing simulates or draws behind the menu ([`src/game/Game.ts:378-380`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L378-L380)). The menu offers:

| Menu action | Effect | Source |
|---|---|---|
| Resume | `setPaused(false)` | [`src/game/Game.ts:230`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L230) |
| Restart | `saveManager.clear()` then page reload — a true new game | [`src/game/Game.ts:600-604`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L600-L604) |
| Sound ON/OFF | `audio.setMuted(!audio.muted)`; same as pressing `KeyM` | [`src/game/Game.ts:232-233`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L232-L233) |
| Stats line | `MONEY · LEVEL · KILLS · WANTED ★`, rebuilt each open | [`src/game/Game.ts:606-609`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L606-L609), [`src/ui/pauseMenu.ts:61-68`](https://github.com/noiz354/arena-city-try/blob/main/src/ui/pauseMenu.ts#L61-L68) |

## What There Is To Do

Four missions are data-driven from [`src/data/missions.ts:27-81`](https://github.com/noiz354/arena-city-try/blob/main/src/data/missions.ts#L27-L81). Walk into a green start marker within **4.5 m** and press `E`; mission waypoints trigger at **6 m**:

| Mission | Type | Start (x, z) | Reward | Requires |
|---|---|---|---|---|
| PIZZA DELIVERY | delivery | (-60, 60) | $150 + 60 XP | level 1 |
| MIDTOWN SPRINT | race, 6 checkpoints | (82, -52) | $250 + 90 XP | level 1 |
| THUG CLEANUP | assassination | (-92, -84) | $400 + 150 XP | level 2 |
| TAIL THE TARGET | chase, 35 m / 12 s | (104, 64) | $350 + 120 XP | level 2 |

While playing, expect ambient life: AI traffic that can hit the on-foot player (damage scales with impact speed above 2.5 m/s, capped at 40 HP, with knockback along the car heading — [`src/game/Game.ts:543-569`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L543-L569)), pedestrians who flee gunfire, and a wanted-star system where shooting near cops or killing civilians raises your stars ([`src/game/Game.ts:255-270`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L255-L270)). Progress autosaves every 30 s of unpaused play ([`src/game/Game.ts:428-433`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L428-L433)) — see [SaveManager — Persistence Keys & Save/Load Flow](../deep-dive/ui-audio-support/save-manager.md).

### Touch devices

On coarse-pointer hardware the game renders a floating joystick (left half of screen), look-drag (right half) and four buttons (FIRE / E / JUMP / RUN). Full wiring: [MobileControls — Touch Wiring into InputManager](../deep-dive/ui-audio-support/mobile-controls.md).

## Related Pages

| Page | Relationship |
|------|-------------|
| [Dev Setup & Build](./setup.md) | Get the dev server running first |
| [Quick Reference — Debug Console](./quick-reference.md) | Console hooks for QA-ing these controls |
| [MobileControls — Touch Wiring](../deep-dive/ui-audio-support/mobile-controls.md) | How touch gestures become the bindings above |
| [SaveManager — Persistence](../deep-dive/ui-audio-support/save-manager.md) | What autosave stores and restores |
| [MinimapSystem — North-Up Projection](../deep-dive/ui-audio-support/minimap-system.md) | The map you navigate by |
