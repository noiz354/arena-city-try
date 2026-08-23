# Utils, Data & Telemetry

Implementation details for `src/utils/*`, `src/data/*`, and `src/analytics/*`. All line refs are to the file named in each section heading's first mention.

## InputManager

`src/utils/InputManager.ts` — keyboard + mouse-drag input, adapted from the mavonengine InputManager pattern (key state set + delta tracking) (InputManager.ts:1-4). No action-name abstraction layer: consumers query raw `KeyboardEvent.code` strings directly (`isDown('KeyW')` etc.).

**State** (InputManager.ts:6-19): `keys` (Set of held codes), `pressed` (codes pressed this frame), mouse fields (`mouseDown`, `mouseHeld`, `lastMouseX/Y`, `movedSinceDown`), `clickQueued`, plus two accumulator fields reset per frame: public `mouseDelta {x,y}` in pixels (InputManager.ts:16) and public `wheelDelta` (accumulated `deltaY`, InputManager.ts:19). Virtual-input sets `virtualKeys`/`virtualPressed` back the mobile controls (InputManager.ts:110, 145).

**Key binding map — actual codes queried by game code:**

| Code(s) | Action | Queried at |
|---|---|---|
| `KeyW` / `KeyS` | foot moveZ / vehicle throttle fwd-back | Player.ts:136; ModeController.ts:151 |
| `KeyA` / `KeyD` | foot moveX strafe / vehicle steer left-right | Player.ts:135; ModeController.ts:152 |
| `ShiftLeft`, `ShiftRight` | sprint | Player.ts:150 |
| `Space` | jump when grounded; also virtual jump button | Player.ts:172; MobileControls.ts:76 |
| `KeyE` | enter/exit vehicle, start mission / interact | ModeController.ts:115, 159, 166; MobileControls.ts:75 |
| `Digit1`..`Digit4` | switch weapon (loop over `WEAPON_LIST`, matches `WeaponDef.key`) | ModeController.ts:93-94 |
| `KeyR` | start reload | ModeController.ts:99 |
| `Escape` | toggle pause | Game.ts:378 |
| `F3` | toggle collider debug view | Game.ts:401 |
| `KeyM` | mute/unmute audio | Game.ts:490 |

Virtual keys injected by mobile controls map onto the same codes: joystick thresholds (±0.25 normalized) drive `KeyW/S/A/D` via `setVirtualKey` (MobileControls.ts:178-181), buttons fire `pressVirtualKey('KeyE')` and `pressVirtualKey('Space')`, hold-to-sprint uses `setVirtualKey('ShiftLeft', …)` (MobileControls.ts:75-77). The fire button uses `setMouseHeld(true)` and tap = `injectClick()` (MobileControls.ts:69-73); touch drag feeds `addMouseDelta` for camera orbiting (MobileControls.ts:136).

**Event handling:** listeners attached in `attach(target)` — keydown/keyup/mousemove/mouseup/wheel on `window`, mousedown on the passed element only (InputManager.ts:70-78). Keydown ignores auto-repeat (`e.repeat`) (InputManager.ts:22) and calls `preventDefault()` for `Space` + arrow keys to stop page scroll (InputManager.ts:26-28). Mouse click vs drag discrimination: a press+release with cumulative movement < 8 px queues a click (InputManager.ts:61); `isDragging()` is true while held with > 8 px moved — used to avoid shooting while orbiting (InputManager.ts:132-134). Wheel listener registered `{ passive: true }` (InputManager.ts:77).

**Action states:** `isDown(...codes)` = any code held in `keys` OR `virtualKeys` (InputManager.ts:93-95). `wasPressed(...codes)` = frame-edge check against `pressed` OR `virtualPressed`; matched virtual presses are consumed on read (InputManager.ts:98-108). Edge-triggered virtual presses can also be polled explicitly with `consumeVirtualPress(code)` (InputManager.ts:113-115). Clicks are consumed once via `consumeClick()` (InputManager.ts:137-141). Continuous mouse state via `isMouseDown()` = `mouseHeld` (InputManager.ts:127-129).

**Frame lifecycle:** `endFrame()` clears `pressed` and zeroes `mouseDelta`/`wheelDelta` — must be called once per frame at end of update (InputManager.ts:169-174). `clearTransient()` drops all queued edges incl. `mouseHeld`, used on pause so no stale click fires after resume (InputManager.ts:177-182).

## Raycast Utilities

`src/utils/raycast.ts` — analytic ray helpers used by shooting (WeaponSystem), enemy vision (EnemySystem), and camera collision (raycast.ts:3-6). All return entry distance `t` along the ray, or `null`.

- **`rayAABB(origin, dir, boxMin, boxMax, maxDist)`** — slab method over the 3 axes; per-axis early-out when `|d| < 1e-9` and origin outside slab (raycast.ts:23-24); returns `tmin` or null when `tmin > tmax` (raycast.ts:9-35). Callers: WeaponSystem bullet-vs-world boxes at weapon range (WeaponSystem.ts:224), EnemySystem line-of-sight checks (EnemySystem.ts:108, imported at :11), CameraRig camera-vs-building pull-in (CameraRig.ts:76) — note CameraRig keeps its own *duplicate local copy* of rayAABB instead of importing from utils (CameraRig.ts:92).
- **`raySphere(origin, dir, center, radius, maxDist)`** — quadratic intersection with cheap reject if sphere center is behind origin or beyond maxDist (`b < 0 || b > maxDist`), then discriminant check, entry root `t = b − √disc` only, valid within `[0, maxDist]` (raycast.ts:38-53).
- **`rayCapsule(origin, dir, feet, radius, height, maxDist)`** — vertical capsule approximated by sampling 4 spheres at axis fractions `[0.08, 0.38, 0.68, 0.95]` covering feet/hips/chest/head, sample-sphere radius inflated ×1.15 to close gaps between samples, nearest hit kept (raycast.ts:61-81). Chosen for determinism so chest-aimed shots connect (raycast.ts:55-60).
- **`rayHuman(...)`** — standard humanoid preset: radius **0.4**, height **1.75**, feet-based (raycast.ts:84-91). WeaponSystem passes per-entity `hitRadius`/`hitHeight` instead for enemies, with target fallback height 1.8 (WeaponSystem.ts:232, 242).

## Texel Utilities

`src/utils/texel.ts` — shadow-texel snapping extracted as pure functions so the stabilization math is unit-testable headlessly (texel.ts:1-4).

- `worldTexelSize(halfExtent, mapSize)` = `(halfExtent * 2) / mapSize` — world meters per shadow-map texel (texel.ts:7-9).
- `snapToGrid(value, size)` = round-to-nearest cell; passthrough when `size <= 0` (texel.ts:12-15).

Sole consumer is `World.updateSun(playerX, playerZ, sunDir)` (import World.ts:20): computes world texel from the shadow frustum half-extent + map size (World.ts:102-103), snaps the frustum center XZ to that grid so shadows don't swim as the player moves (World.ts:105-114), and scales `shadow.normalBias = worldTexel * 1.25` for scale-stable bias (World.ts:117).

## Logger & Error Handling

**Logger** — `src/utils/logger.ts`: singleton structured logger, no external deps (logger.ts:1-4). Levels `debug|info|warn|error` ordered 10/20/30/40 (logger.ts:5, 17); global minimum is `'info'`, changeable via `setLevel()` (logger.ts:20, 23-25). Each entry becomes a `LogEntry {level, system, message, at: performance.now(), data?}` (logger.ts:7-13, 33) and is printed to console as `[LEVEL] [system] message [data]`, with `debug` routed to `console.log` (logger.ts:34-41). Extra sinks can subscribe via `addSink(sink)` and receive every emitted entry (logger.ts:15, 27-29, 42). No code in the repo currently calls `addSink` or lowers the level below info — debug lines are effectively compiled-in but filtered.

**Error handling** — `src/utils/errors.ts`: `initErrorHandling(options)` installs global handlers; called first thing from main.ts so even constructor/boot errors are caught (errors.ts:22-32; main.ts:9-14). Safe no-op outside a browser (`typeof window === 'undefined'`) for headless tests (errors.ts:33).

Captured sources:
- `window.onerror` → report `{type:'error', message, source/lineno/colno, stack}` (errors.ts:41-51).
- `unhandledrejection` → report `{type:'rejection', message, stack}` (errors.ts:53-61).
- WebGL context loss on the canvas: `preventDefault()`, reports `{type:'webgl', …}`, and swaps in a full-screen "Graphics context lost" overlay with a Reload button that does `window.location.reload()` (errors.ts:64-74).

Every report flows through one `report()` closure: logs via `logger.error('global', …)` (logger.ts import chain), forwards to the optional `onReport` sink (main.ts passes `r => tracker.track('error', {…})`), and shows a dev overlay when `options.overlay ?? import.meta.env.DEV` (errors.ts:35-39, 77-79). The overlay (bottom-right red card) renders type + escaped message + a collapsible `<details>` stack truncated to 800 chars, auto-removes after **12 s**, HTML-escaped via `escapeHtml()` to prevent injection from error text (errors.ts:83-101). Fatal boot failure gets its own full-screen fatal panel + `boot_failed` analytics event (main.ts:31-45).

## Data Tables: Missions

`src/data/missions.ts` — data-driven mission descriptors (missions.ts:1-3). Types: `'delivery' | 'assassination' | 'race' | 'chase'` (missions.ts:4). `MissionDef` fields include optional per-type payloads: `pickup/dropoff` (delivery), `targetId` (assassination: index of thug), `checkpoints[]` (race), `followRange/followTime` (chase) (missions.ts:6-25).

All **4** missions in `MISSIONS` (missions.ts:27-81):

| id | name | type | start (x,z) | reward | xp | requiresLevel | payload |
|---|---|---|---|---|---|---|---|
| `delivery_1` | PIZZA DELIVERY | delivery | (-60, 60) | 150 | 60 | 1 | pickup (-62,58) → dropoff (92,-64) |
| `race_1` | MIDTOWN SPRINT | race | (82, -52) | 250 | 90 | 1 | 6 checkpoints: (40,-80), (-40,-80), (-80,-40), (-40,40), (40,80), (80,40) |
| `assassination_1` | THUG CLEANUP | assassination | (-92, -84) | 400 | 150 | 2 | targetId 3 |
| `chase_1` | TAIL THE TARGET | chase | (104, 64) | 350 | 120 | 2 | followRange 35 m, followTime 12 s |

Shared tuning constants: `MISSION_START_DIST = 4.5` (m, proximity to start a mission) and `WAYPOINT_DIST = 6` (m, checkpoint reached) (missions.ts:83-84); consumed by MissionSystem (MissionSystem.ts:9, 85, 165, 177).

## Data Tables: Vehicles

`src/data/vehicles.ts` — `VehicleData` spec covers colors, physics (`acceleration` m/s², `maxSpeed`/`reverseMax` m/s, `brakeForce` m/s², per-second `friction` multiplier ~0.98 style, `turnRate` rad/s, visual `rollFactor`), hitbox dimensions (`width/height/length`, `wheelRadius`), and `maxHealth` (vehicles.ts:5-24). All **4** entries:

| Spec | Sedan | Taxi | Muscle | Truck |
|---|---|---|---|---|
| color / cabinColor | 0x2e86de / 0x1b4f72 | 0xf5c542 / 0x6d5a1a | 0xc0392b / 0x641e16 | 0x8fa3b8 / 0x46586e |
| acceleration | 11 | 11* | 16 | 7 |
| maxSpeed | 24 | **22** | 30 | 17 |
| reverseMax | 8 | 8* | 9 | 6 |
| brakeForce | 18 | 18* | 22 | 14 |
| friction | 0.985 | 0.985* | 0.982 | 0.99 |
| turnRate | 1.7 | 1.7* | 1.5 | 1.0 |
| rollFactor | 0.06 | 0.06* | 0.08 | 0.04 |
| w × h × l | 2.1×1.5×4.6 | same* | 2.2×1.4×4.8 | 2.6×2.2×6.4 |
| wheelRadius | 0.38 | 0.38* | 0.42 | 0.5 |
| maxHealth | 100 | 100* | 100 | **150** |

(*Taxi is `...VEHICLE_SEDAN` spread overriding only `name`, `color`, `cabinColor`, `maxSpeed` → 22 — vehicles.ts:44-50.)

Exports: four individual configs (VEHICLE_SEDAN vehicles.ts:26, VEHICLE_TAXI :44, VEHICLE_MUSCLE :52, VEHICLE_TRUCK :70) plus `VEHICLE_CONFIGS` array in that order (vehicles.ts:88-93). Consumers index positionally: VehicleManager spawns player sedan/taxi/muscle from indices 0/1/2 (VehicleManager.ts:31-37), parked/traffic cars pick a random config via RNG (VehicleManager.ts:89; TrafficSystem.ts:65).

## Data Tables: Weapons

`src/data/weapons.ts` — `WeaponDef`: id/name/switch key, damage, magSize, reserveMax, reloadTime (s), fireRate (s between shots), `auto`, spread (rad), pellets, recoil (camera-pitch kick rad), range (m), gun + tracer colors (weapons.ts:4-21). All **4** weapons in `WEAPONS` record (weapons.ts:23-92):

| Field | pistol | smg | shotgun | rifle |
|---|---|---|---|---|
| key | 1 | 2 | 3 | 4 |
| damage | 34 | 18 | **16 ×6 pellets** | 30 |
| magSize / reserveMax | 12 / 60 | 30 / 120 | 8 / 40 | 24 / 96 |
| reloadTime (s) | 1.1 | 1.6 | 2.6 | 2.0 |
| fireRate (s) | 0.28 | 0.085 | 0.9 | 0.11 |
| auto | false | true | false | true |
| spread (rad) | 0.012 | 0.028 | 0.09 | 0.018 |
| recoil (rad) | 0.012 | 0.008 | 0.05 | 0.012 |
| range (m) | 120 | 100 | 45 | 160 |
| color / tracer | 0x2c2c30 / 0xffe9a0 | 0x33333a / 0xffe9a0 | 0x4a3a2a / 0xffd27a | 0x1f1f24 / 0xfff2b0 |

`WEAPON_LIST = Object.values(WEAPONS)` drives the Digit-key switching loop (ModeController.ts:93) and pickup naming (Game.ts:287); direct lookups by id happen in PickupSystem (PickupSystem.ts:38) and WeaponSystem for ammo grants (`magSize * 0.8`, `reserveMax * 0.5`) and save-state clamping (WeaponSystem.ts:115-149).

## Telemetry

Two layers under `src/analytics/`.

**Transport — Tracker (tracker.ts):** privacy-friendly batcher, no external scripts/cookies (tracker.ts:1-10). Events are `{name, props?, ts, session}` pushed onto an in-memory queue that is persisted to `localStorage` keys `cityrush_analytics_queue` / `cityrush_analytics_session` after every track (tracker.ts:11-16, 27-28, 83-91). Session id is generated once (`Date.now(36)-random`) and reused across visits (tracker.ts:30-32, 51-65). Flush policy: flushAt default **8** events, maxQueue **200**; batches up to `flushAt * 4` POST as JSON `{site, events:[…]}` with `keepalive: true`; queue drains only after a successful response (no loss during flight); failures re-trim to maxQueue and retry later (tracker.ts:47-48, 107-148). On `pagehide` it switches to `navigator.sendBeacon` fire-and-forget (also registered in main.ts:72) (tracker.ts:77-79, 119-127). Destination comes from build-time env vars only: `VITE_ANALYTICS_ENDPOINT` (+ optional `VITE_ANALYTICS_SITE` site id) via `createTracker()` (tracker.ts:172-181); **with no endpoint configured it stays in local-only mode and never sends anything** (tracker.ts:110). Payload shape targets Plausible/Umami-style self-hosted collectors (tracker.ts:7-9). `clearLocal()` wipes queue + session (tracker.ts:159-169); tracker is exposed on `window.tracker` for debugging (main.ts:79).

**Opt-out:** there is **no user-facing opt-out toggle** — opting out means building without `VITE_ANALYTICS_ENDPOINT`, which disables all transmission (tracker.ts:44-46, 110). Events still accumulate locally in localStorage regardless.

**Gameplay mapping — GameTelemetry (gameTelemetry.ts):** wraps the tracker; wired from main.ts by assigning `game.telemetry` (main.ts:47, 68) and calling `frame()/update(dt)` every tick for FPS sampling (main.ts:48-52). Events tracked:

| Event | Props | Trigger / emitter |
|---|---|---|
| `session_start` | ua (first 80 chars), lang, dpr, viewport w/h | boot (gameTelemetry.ts:18-26; main.ts:69) |
| `player_damaged` | – | Game.onPlayerDamaged hook (gameTelemetry.ts:30-32; main.ts:58-61) |
| `kill` | kind 'enemy'\|'civilian', weapon id | Game kill path (gameTelemetry.ts:34-36; Game.ts:268) |
| `weapon_acquired` | weapon id | pickup (gameTelemetry.ts:38-40; Game.ts:286) |
| `ammo_pickup` | – | pickup (gameTelemetry.ts:42-44; Game.ts:292) |
| `mission_start` | mission id, name | MissionSystem accept (gameTelemetry.ts:46-48; Game.ts:215) |
| `mission_complete` | mission id, name, reward | mission done (gameTelemetry.ts:50-52; Game.ts:220) |
| `vehicle_enter` / `vehicle_exit` | – | ModeController (gameTelemetry.ts:54-60; ModeController.ts:183, 199) |
| `wanted_changed` | stars | wanted level delta (gameTelemetry.ts:62-64; Game.ts:438) |
| `player_died` / `player_respawn` | – | ModeController (gameTelemetry.ts:66-72; ModeController.ts:209, 215) |
| `error` | type, message (160 chars) | global handler sink; throttled to 1 per 2 s (gameTelemetry.ts:75-80) |
| `fps_report` | fps, interval | sampled every **10 s**: frames ÷ window seconds, then reset (gameTelemetry.ts:11, 84-95) |
| `snapshot` | arbitrary stats record | on demand e.g. pause/end (gameTelemetry.ts:98-100) |
| `boot_failed` | message | main.ts fatal catch (main.ts:34) |

## Tuning & Extension Points

- **Add content without touching systems:** new missions append to `MISSIONS` (missions.ts:27); new vehicles push into `VEHICLE_CONFIGS` — but note consumers read configs *by index*, so order matters (VehicleManager.ts:31-37, 89; TrafficSystem.ts:65); new weapons add a key to `WEAPONS` — Digit-switching, pickups and saves pick them up automatically via `WEAPON_LIST`/id lookups (weapons.ts:94; ModeController.ts:93; WeaponSystem.ts:115).
- **Rebind controls:** no binding table exists; edits go directly to the `isDown/wasPressed('KeyX')` call sites listed above (Player.ts:135-172, ModeController.ts:94-166, Game.ts:378-490). Mobile controls already route through the virtual-key API, which mirrors physical codes 1:1 (InputManager.ts:143-166).
- **Analytics routing:** swap endpoint/site via env vars only (tracker.ts:177-181); any JSON-array collector works. New game events = one method on GameTelemetry following the existing wrapper pattern.
- **Hitbox fidelity:** capsule-vs-sphere sampling fractions/radius live in `rayCapsule` (SAMPLES array, 1.15 inflation, raycast.ts:70-73); humanoid defaults in `rayHuman` (raycast.ts:90).
- **Shadow stability knobs:** texel grid + bias factor in World.updateSun (`normalBias = worldTexel * 1.25`, World.ts:117); pure helpers are testable headlessly (texel.ts:1-4).
- **Logging verbosity:** raise/lower via `logger.setLevel()`; sinks pluggable via `addSink()` (logger.ts:23-29) — currently unused, a natural seam if logs should ship anywhere.

## Unresolved

- **Duplicate rayAABB:** CameraRig carries a local copy instead of importing `utils/raycast.rayAABB` (CameraRig.ts:92) — drift risk if slab logic changes.
- **No runtime opt-out for telemetry:** only build-time env gating exists; no UI toggle or cookie-consent hook (tracker.ts:44-49).
- **Logger sinks unused:** `addSink` has zero callers in-repo, and nothing ever sets level below `info`, so `debug()` output is always suppressed (grep across src: only definitions found).
- **Telemetry snapshot():** declared but no caller was found in src (only definition, gameTelemetry.ts:98-100) — presumably reserved for pause/end screens not yet wired.
- **Mission `desc` strings** are displayed but were not traced further (out of scope for this page).

