# MobileControls

## Purpose

Touch-screen input layer that makes the desktop keyboard/mouse game playable on phones/tablets (`src/systems/MobileControls.ts:5-13`). On coarse-pointer devices it renders a floating virtual joystick (left half of the screen), a look-drag zone (right half), and four action buttons, translating every gesture into the same virtual-key / mouse-delta API that `InputManager` already exposes — so no gameplay system knows touch exists.

## Execution Flow

**Construction** — built once in the `Game` constructor with the shared `InputManager`: `new MobileControls(this.input)` (`src/game/Game.ts:178`).

1. Device detection: `active = window.matchMedia?.('(pointer: coarse)').matches ?? false` (`MobileControls.ts:28`). If inactive, it creates three empty placeholder divs (so the readonly fields are assigned) and returns — zero DOM added, zero listeners registered (`MobileControls.ts:29-34`).
2. Active path: builds `.mc-stick` (with child `.mc-stick-knob`) and `.mc-buttons` overlays, appends them to `#ui-root` (`MobileControls.ts:36-45, 79-80`; element defined in `index.html:10`). Styling comes from `src/ui/style.css:327-382`.
3. Four buttons via local factory `mk(label, cls, onDown, onUp?)`, each wired for touchstart/touchend/touchcancel with `{ passive: false }` plus preventDefault/stopPropagation so touches never leak to the window router (`MobileControls.ts:47-66`):
   - **FIRE**: down sets `input.setMouseHeld(true)`; up calls `input.injectClick()` then `setMouseHeld(false)` (`MobileControls.ts:68-74`). The click-on-release is what lets semi-auto weapons fire, since `WeaponSystem` uses `consumeClick()` for non-auto guns (`src/systems/WeaponSystem.ts:182-186`) while auto guns poll `isMouseDown()`/`isDragging()`.
   - **E**: `input.pressVirtualKey('KeyE')` (`MobileControls.ts:75`) — consumed by ModeController's mission-zone / vehicle-enter logic (`src/systems/ModeController.ts:115`).
   - Jump button labeled with the up-arrow glyph: `pressVirtualKey('Space')` (`MobileControls.ts:76`).
   - **RUN** (hold): down `setVirtualKey('ShiftLeft', true)`, up `false` (`MobileControls.ts:77`).
4. Registers window-level touchstart/touchmove/touchend/touchcancel handlers as bound arrow-function fields (`MobileControls.ts:83-91`), all non-passive.

**Per-frame** — this system has no update loop. It is purely event-driven; output lands in `InputManager` accumulators that `Game.loop()` drains during update and resets in `input.endFrame()` (`src/game/Game.ts:376-383`; `src/utils/InputManager.ts:168-174`).

**Touch routing — onTouchStart** (`MobileControls.ts:93-116`):
- Touches whose target is inside `.mc-btn` are skipped (buttons self-handle) via `target.closest('.mc-btn')` (`MobileControls.ts:96-97`).
- Role assignment by screen half: role = clientX less than `window.innerWidth / 2` means `'joystick'`, otherwise `'look'`; stored in the `touches` map keyed by `t.identifier` (`MobileControls.ts:99-100`).
- First joystick-role touch claims `joystickId`, repositions the stick base to the touch point (left/top set to clientX/clientY px), shows it (opacity 1), centers the knob, zeroes `stickVec` (`MobileControls.ts:101-110`) — a floating joystick anywhere on the left half.
- First look-role touch claims `lookId` (`MobileControls.ts:111-113`).

**Joystick drag — onTouchMove** (`MobileControls.ts:118-142`):
- Vector from `stickCenter`, clamped to `JOY_RADIUS` (48 px) by rescaling along its own direction when longer (`MobileControls.ts:121-127`).
- Normalized stick vector = delta divided by JOY_RADIUS, giving components in [-1, 1]; knob visually offset via translate(calc(-50% + dx px), calc(-50% + dy px)); then `updateKeys()` maps the analog vector to digital WASD (`MobileControls.ts:128-131`).
- Look touch: compares against previous position cached in the `lastLook` map and feeds pixel deltas into `input.addMouseDelta(dx, dy)` (`MobileControls.ts:132-139`) — the same accumulator mouse dragging fills (`InputManager.ts:163-166`).

**Release — onTouchEnd** (`MobileControls.ts:146-174`): clears `lastLook` and `touches` entries; joystick release hides the stick (opacity 0), zeroes the vector, re-runs `updateKeys()` (releasing all WASD); if the look finger lifts while another queued look touch exists in `touches`, that one is promoted to `lookId` — multi-touch handoff (`MobileControls.ts:156-172`).

**Teardown** — `dispose()` removes both DOM nodes and the four window listeners; called from `Game.destroy()` (`MobileControls.ts:184-191`; `src/game/Game.ts:368`).

## Data Structures

| Field | Type | Meaning |
|---|---|---|
| `active` | boolean (readonly, public) | True on coarse-pointer devices; gates everything |
| `stickEl` / `knobEl` | HTMLDivElement (readonly) | Joystick base circle + inner knob visuals |
| `buttons` | HTMLDivElement (readonly) | Container of the 4 action buttons |
| `touches` | Map of number to 'joystick' or 'look' | Every tracked touch id mapped to its screen-half role |
| `joystickId` / `lookId` | number | Currently claimed touch identifiers; -1 when free |
| `stickCenter` | { x: number; y: number } | Screen-space origin of the active joystick |
| `stickVec` | { x: number; y: number } | Normalized joystick vector, components in [-1, 1] |
| `lastLook` | Map of number to { x, y } | Per-touch previous client position for delta computation (`MobileControls.ts:144`) |

Module constant: `JOY_RADIUS = 48` px (`MobileControls.ts:3`).

## Public API

Deliberately minimal:

- `constructor(input: InputManager)` — takes the shared `InputManager`, immediately decides whether to build UI (`MobileControls.ts:27`).
- `readonly active: boolean` — whether touch mode is on (not consulted elsewhere currently).
- `dispose(): void` — DOM + listener cleanup (`MobileControls.ts:184-191`).

Everything else reaches the game indirectly through these `InputManager` methods (`src/utils/InputManager.ts`): `setVirtualKey(code, down)` toggles codes in a `virtualKeys` set consulted by `isDown()` (`InputManager.ts:93-95, 147-153`); `pressVirtualKey(code)` seeds both the held set and the edge-triggered `virtualPressed` set read by `wasPressed()` (`InputManager.ts:98-108, 117-120`); `injectClick()` sets `clickQueued`, consumed once by `consumeClick()` (`InputManager.ts:136-141, 155-157`); `setMouseHeld(down)` drives `isMouseDown()` (`InputManager.ts:126-129, 159-161`); `addMouseDelta(x, y)` accumulates into `mouseDelta`, cleared per frame by `endFrame()` (`InputManager.ts:16-19, 163-174`).

## Interactions

**Called by:** only `Game` — construction at `src/game/Game.ts:178`, disposal at `Game.ts:368`. No other file references MobileControls.

**Calls into:** `InputManager` exclusively (all injection points listed above). The virtual keys it produces are consumed by:
- ModeController foot mode: WASD movement, `KeyE` interaction (`src/systems/ModeController.ts:115`), sprint via ShiftLeft.
- Player jump handling reads Space through the input manager.
- WeaponSystem firing path: auto weapons read `isMouseDown() && !isDragging()`, semi-autos consume `consumeClick()` (`src/systems/WeaponSystem.ts:182-186`); camera look consumes `mouseDelta` like mouse drag.

**Shared DOM:** appends into `#ui-root`, the same container used by hud, pause menu, minimap and loading screen (`index.html:10`; `src/ui/hud.ts:59`; `src/ui/pauseMenu.ts:58`; `src/systems/MinimapSystem.ts:20`). Buttons use class names `.mc-btn .mc-fire .mc-e` etc.; the window router deliberately ignores any touch starting on `.mc-btn` so HUD elements and buttons coexist.

**Flags/state exchanged:** none beyond injected input events; there are no events or callbacks between this system and Game.

## Tuning & Extension Points

- `JOY_RADIUS = 48` px — max deflection before clamping and normalization divisor (`MobileControls.ts:3`, used at `124-129`). Raise for finer analog control on large screens.
- WASD digital threshold: stick component magnitude greater than `0.25` activates each direction key (`MobileControls.ts:176-182`) — deadzone and sensitivity knob in one.
- Screen-half split at exactly `window.innerWidth / 2` (`MobileControls.ts:99`).
- Button layout lives entirely in CSS: grid of two 56px columns, 10px gap, anchored right: 16px bottom: 120px; `.mc-btn` height 56px round; stick base 110x110px, knob 44x44px, z-index 20; fire button tinted red rgba(220,50,50,0.35) (`src/ui/style.css:351-382`).
- Adding a button: one more `mk(...)` call in the constructor (`MobileControls.ts:68-77`); it automatically gets button-touch isolation because routing skips `.mc-btn` targets.
- Pause interplay: `Game.setPaused` calls `input.clearTransient()`, which drops queued clicks/virtual presses but does NOT clear held `virtualKeys` — a RUN held across pause resumes correctly, while stale taps cannot fire after resume (`src/utils/InputManager.ts:176-182`; `src/game/Game.ts:597`).

## Unresolved

- `onTouchEnd` does not call `e.preventDefault()` (unlike start/move); presumably intentional so default behavior (e.g. synthesized mouse events) is suppressed only where needed, but not verifiable from source alone (`MobileControls.ts:146-174`).
- On inactive (desktop) devices the placeholder divs created at `MobileControls.ts:30-32` are never appended or removed by `dispose()` — harmless no-op nodes, but they do exist until GC.
