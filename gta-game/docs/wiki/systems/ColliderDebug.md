# ColliderDebug

## Purpose

Diagnostic overlay that renders a green wireframe `Box3Helper` for every currently active collidable (static buildings + vehicles), making invisible physics volumes visible — the Three.js equivalent of Unity Gizmos / Godot collision-shape display (`src/systems/ColliderDebug.ts:6-15`). Off by default; explicitly documented as "a DIAGNOSTIC aid, not a gameplay system" (`src/systems/ColliderDebug.ts:12-13`).

## Execution Flow

- **Init**: constructor only sets `root.visible = false` and `enabled = false`; the root Group must be added to the scene by Game (`src/systems/ColliderDebug.ts:24-26`, added at `src/game/Game.ts:175-176`).
- **Toggle path**: `toggle()` flips `enabled`, mirrors it onto `root.visible`, clears all helpers when disabling, and resets `timer = 0` when enabling so the first refresh happens on the very next frame instead of waiting a throttle period (`src/systems/ColliderDebug.ts:29-35`). Returns the new state.
- **Per frame** — `update(dt, collidables)`: early-out unless enabled (`src/systems/ColliderDebug.ts:39`); counts down `timer` and returns while `timer > 0`, i.e. rebuilds at most once per `REFRESH_INTERVAL = 0.25s` (`src/systems/ColliderDebug.ts:4,40-43`). Each rebuild disposes ALL existing helpers and recreates one `Box3Helper(c.box, color)` per entry of the passed-in list (`src/systems/ColliderDebug.ts:46-53`). Because each helper holds a live reference to its source `Box3`, moving vehicle boxes would track between refreshes via Box3Helper's own updateMatrixWorld — but the 0.25s full rebuild is what picks up set membership changes (vehicles entering/leaving visibility).
- **Dispose**: `clear()` removes each helper from root and disposes its geometry + material (`src/systems/ColliderDebug.ts:55-62`); called from Game.destroy (`src/game/Game.ts:363`).

## Data Structures

- `root: Group` — container for helpers, visibility-synced to `enabled` (`src/systems/ColliderDebug.ts:17,25,31`).
- `helpers: Box3Helper[]` — current overlay set (`src/systems/ColliderDebug.ts:21`).
- `color = new Color(0x00ff88)` — single shared green for all boxes (`src/systems/ColliderDebug.ts:20`).
- `timer: number` — countdown to next throttled rebuild (`src/systems/ColliderDebug.ts:22`).
- Input type is the shared minimal `Collidable { box: Box3 }` contract from World (`src/game/World.ts:22-24`) — there are no collider categories, layers, or masks anywhere in the codebase; "which colliders exist" is decided purely by which arrays the caller concatenates.

## Public API

- `enabled: boolean` — current state, public field (`src/systems/ColliderDebug.ts:18`).
- `toggle(): boolean` — flip state, return new state (`src/systems/ColliderDebug.ts:29`).
- `update(dt: number, collidables: Collidable[]): void` — throttled re-sync against the caller's active list (`src/systems/ColliderDebug.ts:38`).
- `dispose(): void` — release helper GPU resources (`src/systems/ColliderDebug.ts:64`).

## Interactions

- **Game wiring**: constructed and its root added to the scene (`src/game/Game.ts:175-176`); toggled by the F3 key via `this.input.wasPressed('F3')` in the main update loop (`src/game/Game.ts:400-401`); fed `allCollidables = world.getCollidables().concat(vehicles.getCollidables())` every frame (`src/game/Game.ts:397-402`) so the overlay shows static buildings AND live vehicles; disposed in destroy (`src/game/Game.ts:363`).
- **Console/QA access**: `main.ts` exposes the whole `Game` instance as `window.game` (`src/main.ts:78`), and `colliderDebug` is a public readonly field with a public `toggle()` (`src/game/Game.ts:74`), so QA can run `window.game.colliderDebug.toggle()` from devtools. The in-file comment claiming a `window.game.debugColliders()` console function (`src/systems/ColliderDebug.ts:10`) refers to an API that does not exist — see Unresolved.
- **Upstream data**: consumes the same collidable lists produced by ChunkManager's active-chunk rebuild (`src/systems/ChunkManager.ts:369-389`) plus VehicleManager's per-vehicle boxes (`src/systems/VehicleManager.ts:69`).

## Tuning & Extension Points

- `REFRESH_INTERVAL = 0.25` seconds — the only constant. Lower for snappier vehicle-box tracking, raise to cut rebuild churn on weak machines (`src/systems/ColliderDebug.ts:4`).
- Overlay color `0x00ff88` (`src/systems/ColliderDebug.ts:20`); split into multiple colors per source (buildings vs vehicles vs traffic) would require tagging `Collidable` entries or passing separate lists.
- Extension point: since `toggle()` returns the new state, keybind UI or a debug menu can reflect state directly.

## Unresolved

- Stale comment: `src/systems/ColliderDebug.ts:10` says the system is toggled "with F3 (or `window.game.debugColliders()` from the console)" — no `debugColliders` symbol exists anywhere in `src/`; the working console path is `window.game.colliderDebug.toggle()`. The comment should be corrected.
- The rebuild-everything approach allocates fresh geometry/material per helper at up to 4 rebuilds/second; fine at current collider counts (~tens), but a persistent-pool variant is the obvious upgrade if the active list grows into the hundreds.
