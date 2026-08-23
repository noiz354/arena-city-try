# SaveManager

## Purpose

Single-key `localStorage` persistence for CITY RUSH (`src/systems/SaveManager.ts:1-5`). It stores the mission/progression profile, player position/health, kill count and the weapon inventory as one JSON payload. It is deliberately dumb: no schema versioning, no migration, just safe serialize/deserialize with corruption swallowed — extracted from `Game.ts` so the game shell stays lean (A-1 refactor step, `SaveManager.ts:2-3`).

## Execution Flow

**Construction** — `new SaveManager()` with the default storage key `'cityrush_save_v1'` happens in `Game`'s constructor right before the pause menu is built (`src/game/Game.ts:228`). The key is injectable via the sole constructor parameter for tests.

**Load path** — during construction `Game.loadSave()` runs once (`src/game/Game.ts:302`, implementation `582-590`):
1. `saveManager.load()` parses the stored JSON; returns `null` on missing key, parse error, or a payload whose `profile` isn't a string (`SaveManager.ts:32-42`).
2. Each field is restored defensively and independently: `profile` → `missions.deserialize()`; `pos` → `player.group.position.set(x, 0.95, z)` (y hardcoded to spawn height); `health` and `kills` only if `typeof === 'number'`; `weapons` → `weapons.deserialize()` (`Game.ts:585-589`).

**Save path** — `Game.save()` assembles the payload from live state and calls `saveManager.save(data)` (`src/game/Game.ts:571-580`). It fires on three triggers:
- Auto-save every 30 s of unpaused gameplay: `saveTimer` starts at `30` (`Game.ts:86`), counts down by `delta` each frame, resets to `30` and saves at `<= 0` (`Game.ts:428-433`).
- Mission completion hook (`missions.hooks.onMissionComplete`) (`Game.ts:217-222`).
- `destroy()` — persists on session teardown (`Game.ts:356`).

**Clear path** — `restart()` calls `saveManager.clear()` then reloads the page, i.e. "new game" (`Game.ts:600-604`).

## Data Structures

| Type / field | Shape | Meaning |
|---|---|---|
| `SaveData.profile` | `string` | `JSON.stringify` of the MissionSystem profile object (money/xp/mission state); re-validated inside `MissionSystem.deserialize` which requires `typeof p.money === 'number'` (`src/systems/MissionSystem.ts:298-311`) |
| `SaveData.pos` | `{ x: number; z: number }` | Player world XZ; y is not saved |
| `SaveData.health` | `number` | Player health at save time |
| `SaveData.kills` | `number` | Lifetime kill counter held by `Game` |
| `SaveData.weapons` | `WeaponSave` | Weapon inventory snapshot |
| `WeaponSave.owned` | `string[]` | Owned weapon ids (validated against the `WEAPONS` table on load) |
| `WeaponSave.current` | `string` | Currently equipped weapon id |
| `WeaponSave.ammo` | `Record<string, { mag: number; reserve: number }>` | Per-weapon-id ammo counts |

Class state: only `private readonly key: string` (default `'cityrush_save_v1'`, `SaveManager.ts:21`). The class holds no cached data — every call hits localStorage.

## Public API

All three methods are try/catch-wrapped so private-mode browsers or quota errors never crash the game (`SaveManager.ts:23-50`):

- `constructor(key = 'cityrush_save_v1')` — storage key injection point (`SaveManager.ts:21`).
- `save(data: SaveData): boolean` — `JSON.stringify` + `localStorage.setItem`; returns `true` on success, `false` if storage threw (`SaveManager.ts:23-30`).
- `load(): SaveData | null` — reads and parses; returns `null` when the key is absent, JSON is malformed, or `data.profile` is not a string (the minimal integrity check) (`SaveManager.ts:32-42`). Note it does **not** validate other fields — that burden is on callers.
- `clear(): void` — removes the key; silently ignores storage errors (`SaveManager.ts:44-50`).

## Interactions

**Called by (only consumer is `Game`):**
- `Game.save()` builds `SaveData` from `this.missions.serialize()`, `this.player.position`, `this.player.health`, `this.kills`, `this.weapons.serialize()` (`Game.ts:573-579`).
- `Game.loadSave()` distributes loaded fields to `MissionSystem.deserialize`, `Player`, and `WeaponSystem.deserialize` (`Game.ts:582-590`); called once from the constructor (`Game.ts:302`).
- Auto-save tick in `Game.update()` (`Game.ts:429-433`), mission-complete callback (`Game.ts:221`), `destroy()` (`Game.ts:356`), `restart()` clear+reload (`Game.ts:602`).

**Downstream serializers (not called directly by SaveManager but define its payload):**
- `MissionSystem.serialize()/deserialize()` — raw profile JSON round-trip with an xp→level recomputation on load (`src/systems/MissionSystem.ts:298-311`).
- `WeaponSystem.serialize()/deserialize()` — filters owned ids against `WEAPONS`, clamps restored `mag`/`reserve` to `magSize`/`reserveMax`, clears any reload-in-progress (`src/systems/WeaponSystem.ts:131-153`).

**Flags/events exchanged:** none — plain data pull/push. There is no dirty flag; saving is time-based and event-based rather than change-based.

## Tuning & Extension Points

- Storage key `'cityrush_save_v1'` (`SaveManager.ts:21`) — bump the suffix for any breaking schema change; there is no migration machinery, old saves are simply ignored (or rejected by the `profile` string check).
- Auto-save interval `30` seconds — defined twice, initial value `private saveTimer = 30` (`Game.ts:86`) and reset value `this.saveTimer = 30` (`Game.ts:431`); change both together.
- Spawn Y restore constant `0.95` in `loadSave` (`Game.ts:586`) must match the spawn height used at `Game.ts:182`.
- Safe extensions: add new top-level optional fields to `SaveData` and mirror the per-field `typeof` guard pattern in `loadSave` (`Game.ts:587-588`) — old saves without the field keep loading.
- Do not store transient state here (active mission timers, wanted stars) — the current payload intentionally captures only progression + position + inventory.

## Unresolved

- `load()` validates only `data.profile`; a save with valid `profile` but garbage `pos`/`health` relies entirely on `Game.loadSave`'s per-field guards, and `pos.x/z` types are unchecked (`NaN` would propagate into `position.set`). Whether this is acceptable risk or an oversight isn't decidable from source alone.
