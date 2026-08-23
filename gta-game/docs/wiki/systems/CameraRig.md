# CameraRig

## Purpose

CameraRig is the third-person chase camera for CITY RUSH: it orbits a spherical offset around a target (player or vehicle), applies mouse-drag orbit and scroll zoom, shortens its boom when obstacles block the view via a ray-vs-AABB slab test, and smooth-damps zoom changes (`src/systems/CameraRig.ts:13-16`, adapted from "Edelweiss CameraControl.js and 3d-game camera.js"). Its dual yaw model is GTA-style: on foot the camera is fully user-orbited; while driving it follows the vehicle heading plus a persistent mouse offset (`src/systems/CameraRig.ts:18-21`).

## Execution Flow

**Construction** — `new CameraRig(camera)` in `Game`'s constructor, late in boot after player/systems are wired (`src/game/Game.ts:305`). The rig owns no objects besides the `PerspectiveCamera` reference (created at `src/game/Game.ts:133` with FOV 60, near 0.1, far 2000); it mutates only `camera.position` and the look-at each frame.

**Mode transitions** (called by ModeController):

- `onEnterVehicle(vehicleYaw)` — snaps behind the car: sets `followYaw = vehicleYaw`, zeroes `mouseYaw`, copies heading into `yaw`, and clamps current distance into `[MIN_DISTANCE + 2 = 4.5, MAX_DISTANCE]` (`src/systems/CameraRig.ts:38-43`)
- `onExitVehicle()` — clears `followYaw` to null → free orbit resumes keeping the current view heading (`src/systems/CameraRig.ts:46-48`)

**Per-frame update** — `update(dt, input, targetPos, collidables)` is called from ModeController every tick, once per mode (`src/systems/ModeController.ts:89` foot, `156` driving), and runs five stages:

1. **Orbit** (`src/systems/CameraRig.ts:52-54`): `mouseYaw -= input.mouseDelta.x × 0.0035`; pitch clamped to `[0.05, PITCH_LIMIT = 0.55]` rad; then `yaw = followYaw === null ? mouseYaw : followYaw + mouseYaw`.
2. **Zoom** (`src/systems/CameraRig.ts:57-64`): wheel input scales `targetDistance += wheelDelta × 0.008`, clamped to `[2.5, 20]`; actual `distance` exponential-damps toward it with lambda **6** (`MathUtils.damp`).
3. **Spherical offset** (`src/systems/CameraRig.ts:66-69`): `dirToCamera = (sin(yaw)·cos(pitch), sin(pitch), cos(yaw)·cos(pitch))`; desired point is `targetPos + dirToCamera × distance`.
4. **Wall avoidance** (`src/systems/CameraRig.ts:71-80`): ray origin is target head height (`targetPos.y + LOOK_HEIGHT = 1.4`). For every collidable AABB, `rayAABB` returns entry distance t along the ray up to `distance + WALL_MARGIN (0.35)`; if `hitT < finalDist - 0.05` (0.05 hysteresis guard), the boom shortens to `max(hitT - WALL_MARGIN, MIN_DISTANCE)`. Note the loop keeps iterating all boxes but later hits can only shorten further.
5. **Placement** (`src/systems/CameraRig.ts:82-84`): final position = ray origin + `dirToCamera × finalDist`; camera looks at `(targetPos.x, targetPos.y + 1.4, targetPos.z)`. The rig does not touch rotation beyond `lookAt`.

Screen shake is layered on top by PostFX *after* this update, bracketing the render call (`src/game/Game.ts:460-466`), so shake never corrupts rig state.

The `rayAABB` helper (module-private function, `src/systems/CameraRig.ts:92-118`) is the classic slab method over x/y/z axes: per axis, if `|d| < 1e-9` the ray is parallel — miss if origin outside slab; otherwise swap t1/t2 as needed, tighten `tmin/tmax`, fail if `tmin > tmax`; return entry `tmin`.

## Data Structures

| Member | Type | Meaning |
|---|---|---|
| `yaw` | `number` (public) | Effective orbit angle around Y; starts `Math.PI × 0.35` (~63°). Read externally — `Player.update` uses it as movement basis (`src/systems/ModeController.ts:87`) |
| `pitch` | `number` (public) | Elevation of the boom in radians, range `[0.05, 0.55]` |
| `followYaw` | `number \| null` (public) | Vehicle heading while driving, null on foot. Written directly by ModeController each frame (`src/systems/ModeController.ts:88,155`) |
| `mouseYaw` | `number` (private) | Persistent user orbit offset; reset to 0 on vehicle entry |
| `distance` / `targetDistance` | `number` (private) | Current vs. requested boom length, both start `START_DISTANCE = 9` |
| `dirToCamera` / `origin` / `desired` | `Vector3` (private readonly) | Scratch vectors reused per frame to avoid allocation |

`Collidable` consumed here is `{ box: Box3 }` (`src/game/World.ts:22-24`). Input comes from `InputManager.mouseDelta` (accumulated drag pixels while left button held, `src/utils/InputManager.ts:45-54`) and `wheelDelta` (accumulated `deltaY`, `src/utils/InputManager.ts:64-66`), both cleared by `input.endFrame()` after the game update (`src/utils/InputManager.ts:171-173`, called from `src/game/Game.ts:382`).

## Public API

- `constructor(readonly camera: PerspectiveCamera)` — binds the camera to move (`src/systems/CameraRig.ts:35`).
- `onEnterVehicle(vehicleYaw: number): void` — snap behind car; resets mouse offset; raises minimum boom to 4.5 for the moment of entry (`src/systems/CameraRig.ts:38-43`).
- `onExitVehicle(): void` — back to free orbit preserving current heading (`src/systems/CameraRig.ts:46-48`).
- `update(dt: number, input: InputManager, targetPos: Vector3, collidables: Collidable[]): void` — full camera solve described above; must be called once per frame after the target's position is final (`src/systems/CameraRig.ts:50`).

## Interactions

| Counterparty | Direction | What flows |
|---|---|---|
| `Game` (`src/game/Game.ts:305`) | creates rig | camera reference |
| `ModeController.onFoot` (`src/systems/ModeController.ts:88-89`) | ↔ rig | sets `followYaw = null`; calls `update(dt, input, player.position, solid)` where `solid` = buildings + parked vehicles (traffic deliberately excluded so moving cars don't cause snap-jitter — comment at `src/systems/ModeController.ts:83-84`) |
| `ModeController.driving` (`src/systems/ModeController.ts:155-156`) | ↔ rig | sets `followYaw = v.yaw` every frame; calls `update` with world + vehicles excluding self (`src/systems/ModeController.ts:147`) |
| `enterVehicle`/`exitVehicle` (`src/systems/ModeController.ts:182,198`) | → rig | transition calls `onEnterVehicle(v.yaw)` / `onExitVehicle()` |
| `Player.update` (`src/systems/ModeController.ts:87`) | ← rig | reads public `cameraRig.yaw` to orient movement relative to view |
| `InputManager` (`src/utils/InputManager.ts:16-19,49-50,65`) | ← rig | consumes `mouseDelta.x/y` and `wheelDelta` accumulators; mobile touch drag feeds the same accumulator via MobileControls (`src/systems/MobileControls.ts:133`) |
| World/Vehicle/Traffic collidable providers (`src/game/World.ts:125-126`, `src/systems/VehicleManager.ts:69-72`) | ← rig | `{ box }` AABB list for wall avoidance |

Flags/state exchanged: `followYaw` is the single piece of shared state written by an external system mid-frame; `yaw` is the single value read externally.

## Tuning & Extension Points

Module constants (`src/systems/CameraRig.ts:5-11`):

| Constant | Value | Meaning |
|---|---|---|
| `MIN_DISTANCE` | `2.5` | Closest boom (also floor for wall-shortened distance) |
| `MAX_DISTANCE` | `20` | Farthest zoom |
| `START_DISTANCE` | `9` | Initial boom length |
| `LOOK_HEIGHT` | `1.4` | Look-at height above target origin ("chest height") |
| `MOUSE_SENSITIVITY` | `0.0035` | Radians per pixel of drag |
| `PITCH_LIMIT` | `0.55` rad (~31.5°) | Max elevation above horizon; min is hard-coded `0.05` (line 53) |
| `WALL_MARGIN` | `0.35` | Gap kept between camera and obstructing geometry |

Other tunables: wheel zoom scale `0.008` per deltaY unit (line 59), damp lambda `6` (line 64), entry-distance clamp offset `MIN_DISTANCE + 2` (line 42), hit-hysteresis `0.05` (line 77), ray parallel epsilon `1e-9` (line 106).

Extension points: to change follow behavior (e.g. speed-based boom extension while driving) mutate `targetDistance` inside stage 2 based on external state passed into `update`. To add collision shapes other than AABBs, extend the loop at lines 75–80 with additional intersectors returning entry-t. The initial `yaw = Math.PI * 0.35` (line 23) defines the opening shot framing.

## Unresolved

- The scratch vector `desired` computed at `src/systems/CameraRig.ts:69` is never read afterward — placement recomputes from `origin + dirToCamera × finalDist` instead of using it. It appears to be dead state kept from the source adaptation.
- Wall avoidance iterates every active collidable linearly per frame (no spatial query, unlike enemy LOS which uses chunk queries at `src/game/Game.ts:405`); whether that's a measured perf cost is not recorded.
