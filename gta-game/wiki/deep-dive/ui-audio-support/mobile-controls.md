---
title: "MobileControls — Touch Wiring into InputManager"
description: "How the virtual joystick, look-drag and four action buttons translate multi-touch gestures into the same virtual-key API keyboard players use."
---

# MobileControls — Touch Wiring into InputManager

## Why This Layer Exists

MobileControls makes the desktop keyboard/mouse game playable on phones and tablets **without any gameplay system knowing touch exists**. It renders a floating joystick (left half of screen), a look-drag zone (right half), and four action buttons, translating every gesture into the same virtual-key / mouse-delta API that `InputManager` already exposes ([`src/systems/MobileControls.ts:5-13`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L5-L13)).

It has **no update loop** — it is purely event-driven. Output lands in InputManager accumulators that `Game.loop()` drains during update and `input.endFrame()` resets ([`src/utils/InputManager.ts:169-174`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L169-L174)).

## Device Gating & DOM

Construction happens once in the Game constructor with the shared InputManager ([`src/game/Game.ts:178`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L178)). Detection uses `window.matchMedia('(pointer: coarse)')`; on desktop it creates three empty placeholder divs and returns — zero DOM appended, zero listeners registered ([`src/systems/MobileControls.ts:28-34`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L28-L34)). On touch devices it appends `.mc-stick` (with knob child) and `.mc-buttons` into the shared `#ui-root` container from [`index.html:10`](https://github.com/noiz354/arena-city-try/blob/main/index.html#L10), styled by [`src/ui/style.css`](https://github.com/noiz354/arena-city-try/blob/main/src/ui/style.css).

## The Button Set

All four buttons come from one local factory `mk(label, cls, onDown, onUp?)`, each wired for touchstart/touchend/touchcancel with `{ passive: false }` plus preventDefault/stopPropagation so touches never leak to the window router ([`src/systems/MobileControls.ts:47-66`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L47-L66)):

| Button | Down | Up | Consumed by | Source |
|---|---|---|---|---|
| FIRE | `input.setMouseHeld(true)` | `injectClick()` then `setMouseHeld(false)` | WeaponSystem: auto guns poll held state; semi-autos consume the click-on-release | [`src/systems/MobileControls.ts:68-74`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L68-L74), [`src/systems/WeaponSystem.ts:182-186`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/WeaponSystem.ts#L182-L186) |
| E | `pressVirtualKey('KeyE')` | — | ModeController mission-zone / vehicle-enter logic | [`src/systems/MobileControls.ts:75`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L75), [`src/systems/ModeController.ts:115`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L115) |
| ⤒ (jump) | `pressVirtualKey('Space')` | — | Player jump when grounded | [`src/systems/MobileControls.ts:76`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L76) |
| RUN (hold) | `setVirtualKey('ShiftLeft', true)` | `false` | Sprint | [`src/systems/MobileControls.ts:77`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L77) |

The click-on-release design is what lets semi-auto weapons (pistol/shotgun) fire from a tap — `WeaponSystem` uses `consumeClick()` for non-auto guns while auto guns poll `isMouseDown()`/`isDragging()` ([`docs/wiki/systems/MobileControls.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/MobileControls.md)).

## Touch Routing State Machine

Window-level handlers are registered as bound arrow-function fields, all non-passive ([`src/systems/MobileControls.ts:83-91`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L83-L91)). Role assignment happens at touchstart:

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    TS["touchstart on window"] --> BTN{"target.closest('.mc-btn')?"}
    BTN -- yes --> SKIP["skip - buttons self-handle"]
    BTN -- no --> HALF{"clientX < innerWidth / 2?"}
    HALF -- "left" --> J1{"joystickId free (-1)?"}
    J1 -- yes --> CLAIM["claim joystickId<br>move stick base to touch point<br>show stick, center knob, zero vector"]
    J1 -- no --> MAP["record role only in touches map"]
    HALF -- "right" --> L1{"lookId free?"}
    L1 -- yes --> CLAIML["claim lookId"]
    L1 -- no --> MAP2["record role only"]
```

<!-- Sources: src/systems/MobileControls.ts:93-116 -->

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
stateDiagram-v2
    direction LR
    state "touch tracked in touches map" as T
    [*] --> T : touchstart assigns role by screen half
    T --> Joystick : role=joystick AND claim slot
    T --> Look : role=look AND claim slot
    Joystick --> Joystick : move: clamp to 48px,<br>normalize, updateKeys()
    Look --> Look : move: addMouseDelta(dx, dy)<br>vs lastLook cache
    Joystick --> [*] : release hides stick,<br>zeroes vector, re-runs updateKeys
    Look --> Look : handoff: promote another queued look touch
    Look --> [*] : release clears lastLook entry
```

<!-- Sources: src/systems/MobileControls.ts:118-174 -->

Multi-touch handoff detail: if the look finger lifts while another queued look-role touch exists in the map, that one is promoted to `lookId` ([`src/systems/MobileControls.ts:156-172`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L156-L172)).

## Joystick → WASD Mapping

Joystick drag clamps the vector to `JOY_RADIUS = 48` px by rescaling along its own direction, then normalizes to components in [-1, 1] ([`src/systems/MobileControls.ts:118-131`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L118-L131)). `updateKeys()` converts that analog vector into digital keys with a **0.25 deadzone/threshold in one knob** ([`src/systems/MobileControls.ts:176-182`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L176-L182)):

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant F as Finger (joystick role)
    participant MC as MobileControls.onTouchMove
    participant IM as InputManager
    participant PL as Player / ModeController
    F->>MC: touchmove at (x, y)
    MC->>MC: delta from stickCenter, clamp to 48 px, normalize
    MC->>IM: setVirtualKey(KeyW/S/A/D) per 0.25 threshold
    MC->>MC: move knob visual via CSS translate
    Note over IM: virtualKeys set consulted by isDown()
    PL->>IM: isDown('KeyW') during update
    IM-->>PL: true -> movement as if keyboard held
```

<!-- Sources: src/systems/MobileControls.ts:118-142,176-182, src/utils/InputManager.ts:93-95,147-153 -->

Look-drag takes the other path: pixel deltas versus a cached previous position feed `input.addMouseDelta(dx, dy)` — the same accumulator mouse dragging fills, cleared each frame by `endFrame()` ([`src/utils/InputManager.ts:163-174`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L163-L174)).

## Injection Points Used

Everything reaches the game through exactly five InputManager methods ([`docs/wiki/systems/MobileControls.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/MobileControls.md)):

| Method | Sets | Read by | Source |
|---|---|---|---|
| `setVirtualKey(code, down)` | `virtualKeys` set consulted by `isDown()` | Player movement, sprint | [`src/utils/InputManager.ts:147-153`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L147-L153) |
| `pressVirtualKey(code)` | seeds held set + edge-triggered `virtualPressed` read by `wasPressed()`, consumed on read | E interact, Space jump | [`src/utils/InputManager.ts:98-108`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L98-L108) |
| `injectClick()` | `clickQueued`, consumed once by `consumeClick()` | semi-auto firing | [`src/utils/InputManager.ts:136-141`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L136-L141) |
| `setMouseHeld(down)` | drives `isMouseDown()` | auto-weapon fire | [`src/utils/InputManager.ts:159-161`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L159-L161) |
| `addMouseDelta(x, y)` | accumulates `mouseDelta`, cleared per frame | camera look/orbit | [`src/utils/InputManager.ts:163-166`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L163-L166) |

Pause interplay: `Game.setPaused` calls `input.clearTransient()`, which drops queued clicks/virtual presses but does **not** clear held `virtualKeys` — a RUN held across pause resumes correctly while stale taps cannot fire after resume ([`src/utils/InputManager.ts:177-182`](https://github.com/noiz354/arena-city-try/blob/main/src/utils/InputManager.ts#L177-L182), [`src/game/Game.ts:597`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L597)).

## Tuning & Extension Points

| Knob | Value / location | Effect | Source |
|---|---|---|---|
| `JOY_RADIUS` | 48 px module constant | Max deflection + normalization divisor; raise for finer analog control | [`src/systems/MobileControls.ts:3`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L3) |
| Digital threshold | ±0.25 normalized component | Deadzone and sensitivity in one | [`src/systems/MobileControls.ts:178-181`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L178-L181) |
| Screen-half split | exact `innerWidth / 2` at touchstart | Joystick vs look assignment | [`src/systems/MobileControls.ts:99`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L99) |
| Button layout | CSS only: two 56 px columns, stick base 110 px, knob 44 px, z-index 20 | Visual tuning without code | [`src/ui/style.css`](https://github.com/noiz354/arena-city-try/blob/main/src/ui/style.css) |
| Adding a button | one more `mk(...)` call — automatically isolated from window routing because routing skips `.mc-btn` targets | — | [`src/systems/MobileControls.ts:68-77`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L68-L77) |

Teardown: `dispose()` removes both DOM nodes and all four window listeners; called from `Game.destroy()` ([`src/systems/MobileControls.ts:184-191`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L184-L191), [`src/game/Game.ts:368`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L368)).

## Unresolved

- `onTouchEnd` does not call `preventDefault()` (unlike start/move) — presumably intentional so synthesized mouse events are suppressed only where needed, but not verifiable from source alone ([`src/systems/MobileControls.ts:146-174`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MobileControls.ts#L146-L174)).
- On desktop the placeholder divs are never appended nor removed by `dispose()` — harmless no-op nodes until GC.

## Related Pages

| Page | Relationship |
|------|-------------|
| [AudioManager](./audio-manager.md) | FIRE button ultimately triggers shoot sounds |
| [MinimapSystem](./minimap-system.md) | Shares the `#ui-root` container on touch devices |
| [Running & Playing CITY RUSH](../../getting-started/usage.md) | The bindings these buttons mirror |
| [Quick Reference — Debug Console](../../getting-started/quick-reference.md) | Verify touch emulation via `game.mobile.active` |
