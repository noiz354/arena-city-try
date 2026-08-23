---
title: "SaveManager — Persistence Keys & Save/Load Flow"
description: "Single-key localStorage persistence: the SaveData payload schema, the three save triggers, defensive load-time restore, and why there is no migration machinery."
---

# SaveManager — Persistence Keys & Save/Load Flow

## Why Persistence Is Shaped Like This

CITY RUSH has **no backend**, so progression lives in `localStorage` under one key, `'cityrush_save_v1'` ([`src/systems/SaveManager.ts:20-21`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L20-L21)). The class is deliberately dumb — no schema versioning, no migration; just safe serialize/deserialize with corruption swallowed. It was extracted from `Game.ts` so the game shell stays lean (the "A-1 refactor" noted in the file header, [`src/systems/SaveManager.ts:2-3`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L2-L3)).

The key is injectable via the sole constructor parameter for tests. The class holds **no cached state** — every call hits storage.

## Payload Schema

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
erDiagram
    SAVE_DATA ||--|| MISSION_PROFILE : profile
    SAVE_DATA ||--|| POSITION : pos
    SAVE_DATA ||--|| HEALTH_KILLS : scalars
    SAVE_DATA ||--|| WEAPON_SAVE : weapons
    WEAPON_SAVE ||--|{ OWNED_ID : owned
    WEAPON_SAVE ||--|| CURRENT_ID : current
    WEAPON_SAVE ||--|{ AMMO_ENTRY : ammo
    AMMO_ENTRY {
        number mag
        number reserve
    }
    POSITION {
        number x
        number z
    }
    HEALTH_KILLS {
        number health
        number kills
    }
```

<!-- Sources: src/systems/SaveManager.ts:6-18 -->

| Field | Shape | Restored into | Validation on load | Source |
|---|---|---|---|---|
| `profile` | stringified MissionSystem profile JSON (money/xp/mission state) | `missions.deserialize()` — recomputes xp→level | must be a string, else whole save rejected | [`src/systems/SaveManager.ts:37`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L37), [`src/game/Game.ts:585`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L585) |
| `pos` | `{ x, z }` — y not saved | `player.group.position.set(x, 0.95, z)` — y forced to spawn height | per-field truthiness only | [`src/game/Game.ts:586`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L586) |
| `health` | number | `player.health` | `typeof === 'number'` guard | [`src/game/Game.ts:587`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L587) |
| `kills` | number | `game.kills` | same guard pattern | [`src/game/Game.ts:588`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L588) |
| `weapons` | `{ owned: string[], current: string, ammo: Record<string, {mag, reserve}> }` | `weapons.deserialize()` — filters ids against the weapons table, clamps counts, cancels reload | delegated to WeaponSystem | [`src/systems/SaveManager.ts:6-10`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L6-L10), [`src/game/Game.ts:589`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L589) |

## The Three Save Triggers and One Clear Path

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
flowchart TD
    T1["Autosave tick<br>saveTimer -= delta<br>fires every 30 s of unpaused play"]
    T2["Mission complete hook<br>onMissionComplete"]
    T3["destroy()<br>session teardown"]
    G["Game.save() assembles payload:<br>missions.serialize(), player x/z,<br>health, kills, weapons.serialize()"]
    SM["saveManager.save(data)<br>JSON.stringify + setItem"]
    OK{"localStorage threw?"}
    ST["returns true"]
    FA["returns false - non-fatal"]
    R["restart(): clear() then location.reload()<br>the 'new game' path"]
    T1 --> G
    T2 --> G
    T3 --> G
    G --> SM --> OK
    OK -- no --> ST
    OK -- yes --> FA
    R -.-> KEY[("cityrush_save_v1")]
    SM -.-> KEY
```

<!-- Sources: src/game/Game.ts:571-580,428-433,217-222,356,600-604, src/systems/SaveManager.ts:23-30,44-50 -->

Trigger locations:

| Trigger | Where | Source |
|---|---|---|
| Auto-save every 30 s | `saveTimer` starts at 30, counts down by delta, resets + saves at ≤ 0 | [`src/game/Game.ts:86`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L86), [`src/game/Game.ts:428-433`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L428-L433) |
| Mission completion | `missions.hooks.onMissionComplete` calls `this.save()` | [`src/game/Game.ts:217-222`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L217-L222) |
| Session teardown | `destroy()` persists first thing | [`src/game/Game.ts:355-357`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L355-L357) |
| New game | pause-menu Restart → `clear()` → page reload | [`src/game/Game.ts:600-604`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L600-L604) |

There is no dirty flag — saving is time-based and event-based, not change-based ([`docs/wiki/systems/SaveManager.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/SaveManager.md)).

## Load Flow at Boot

Loading happens exactly once, inside the `Game` constructor before the first frame:

```mermaid
%%{init: {"theme": "base", "themeVariables": {"primaryColor": "#2d333b", "primaryBorderColor": "#6d5dfc", "primaryTextColor": "#e6edf3", "lineColor": "#8b949e", "secondaryColor": "#161b22", "tertiaryColor": "#161b22", "clusterBkg": "#161b22", "clusterBorder": "#30363d"}}}%%```mermaid
sequenceDiagram
    autonumber
    participant C as Game constructor
    participant LS as Game.loadSave()
    participant SAV as SaveManager.load()
    participant LSKEY as localStorage cityrush_save_v1
    participant SYS as missions / player / kills / weapons
    C->>LS: after all systems constructed
    LS->>SAV: load()
    SAV->>LSKEY: getItem
    alt missing key / parse error / profile not a string
        SAV-->>LS: null -> return, fresh start
    else payload ok
        SAV-->>LS: SaveData
        LS->>SYS: profile -> missions.deserialize()
        LS->>SYS: pos -> position.set(x, 0.95, z)
        LS->>SYS: health, kills via typeof guards
        LS->>SYS: weapons -> weapons.deserialize()
    end
```

<!-- Sources: src/game/Game.ts:302,582-590, src/systems/SaveManager.ts:32-42 -->

Every step is independently guarded so one bad field cannot poison the rest — each field restores only if present/valid ([`src/game/Game.ts:585-589`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L585-L589)).

## Public API

All three methods are try/catch-wrapped so private-mode browsers or quota errors never crash the game ([`src/systems/SaveManager.ts:23-50`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L23-L50)):

| Method | Behavior | Returns | Source |
|---|---|---|---|
| `constructor(key?)` | Storage-key injection point; default `'cityrush_save_v1'` | — | [`src/systems/SaveManager.ts:21`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L21) |
| `save(data)` | stringify + setItem | `true` on success, `false` if storage threw | [`src/systems/SaveManager.ts:23-30`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L23-L30) |
| `load()` | read + parse | `SaveData \| null`; null when absent/malformed/`profile` not a string | [`src/systems/SaveManager.ts:32-42`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L32-L42) |
| `clear()` | removeItem, errors ignored | void | [`src/systems/SaveManager.ts:44-50`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L44-L50) |

Note that `load()` validates only `data.profile`; deeper integrity checks are delegated to downstream serializers:

| Downstream serializer | What it does on load | Source |
|---|---|---|
| `MissionSystem.deserialize(profile)` | Raw profile JSON round-trip; re-validates `typeof p.money === 'number'` before accepting | [`src/systems/MissionSystem.ts:298-311`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/MissionSystem.ts#L298-L311) |
| `WeaponSystem.deserialize(weapons)` | Filters owned ids against the weapons table, clamps restored mag/reserve to `magSize`/`reserveMax`, cancels any reload in progress | [`src/systems/WeaponSystem.ts:131-153`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/WeaponSystem.ts#L131-L153) |

The spawn-height constant that load enforces comes from the same pair used at initial placement (`SPAWN_X` / `SPAWN_Z`, [`src/systems/ModeController.ts:20-21`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/ModeController.ts#L20-L21)).

## Tuning & Extension Points

| Knob | Rule | Source |
|---|---|---|
| Schema change | Bump the `'cityrush_save_v1'` suffix — old saves are simply ignored or rejected by the profile-string check; there is no migration machinery | [`src/systems/SaveManager.ts:21`](https://github.com/noiz354/arena-city-try/blob/main/src/systems/SaveManager.ts#L21) |
| Autosave interval | Defined twice — initial `saveTimer = 30` and reset value; change both together | [`src/game/Game.ts:86`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L86), [`src/game/Game.ts:431`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L431) |
| Spawn-Y constant | Restore uses hardcoded `0.95`, matching the spawn placement — keep in sync | [`src/game/Game.ts:586`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L586), [`src/game/Game.ts:182`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L182) |
| Adding fields | Add optional top-level fields to `SaveData`, mirror the per-field `typeof` guard pattern in `loadSave` — old saves keep loading | [`src/game/Game.ts:587-588`](https://github.com/noiz354/arena-city-try/blob/main/src/game/Game.ts#L587-L588) |

Do not store transient state here (active mission timers, wanted stars) — the payload intentionally captures only progression + position + inventory.

## Unresolved

- `load()` does not validate `pos.x/z` types — a save with valid `profile` but garbage coordinates would propagate `NaN` into `position.set` ([`docs/wiki/systems/SaveManager.md`](https://github.com/noiz354/arena-city-try/blob/main/docs/wiki/systems/SaveManager.md)); whether this is acceptable risk or an oversight isn't decidable from source alone.

## Related Pages

| Page | Relationship |
|------|-------------|
| [MinimapSystem](./minimap-system.md) | Centers its map on the position this system restores |
| [AudioManager](./audio-manager.md) | Sibling support system wired in the same Game constructor block |
| [ColliderDebug](./collider-debug.md) | Also disposed by `Game.destroy()`, which saves first |
| [Quick Reference — Debug Console](../../getting-started/quick-reference.md) | Inspect `game.saveManager` live from devtools |
