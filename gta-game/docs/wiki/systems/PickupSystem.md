# PickupSystem

## Purpose

Ground pickups: weapon crates (color-coded band per weapon) and ammo boxes dropped by dead enemies. Walk-over collection with bob/rotate animation and a scale-down "pop" removal (`src/systems/PickupSystem.ts:20-24`).

## Execution Flow

**Init** — constructed in `Game` with the scene, a `playerPos` closure, and collection hooks (`src/game/Game.ts:278-296`). The constructor adds one internal `Group` to the scene that parents every pickup (`src/systems/PickupSystem.ts:29-35`). Five initial pickups are spawned at boot in `Game.spawnInitialPickups()` (`src/game/Game.ts:611-617`): SMG crate at (−14, 14), shotgun at (14, −14), rifle at (45, −30), ammo boxes at (−20, −20) and (30, 40).

**Spawning** — `spawnWeapon(id, x, z)` (`:37-63`) silently returns if `id` isn't in `WEAPONS` (`src/data/weapons.ts:23-92`); builds a brown crate (0.8×0.6×0.8, `0x6b5638`, roughness 0.7, castShadow) at y = 0.5 plus a thin band (0.84×0.14×0.84) tinted with the weapon's `def.color` so crates are identifiable by color; a random `bobPhase ∈ [0, 2π)` desyncs animations. `spawnAmmo(x, z)` (`:65-88`) builds a smaller box (0.5×0.3×0.5, dark gold `0xb8860b` with emissive `0x4a3600` @ 0.4) at y = 0.35 plus a bright `0xffd166` band.

**Per-frame** — `update(dt)` runs every frame from `Game.update` (`src/game/Game.ts:411`). For each untaken pickup (`:90-104`):
1. Animate: `bobPhase += dt·2.2`; hover height `y = 0.5 + sin(phase)·0.12`; spin `rotation.y += dt·1.4`.
2. Collect check: XZ-only distance to the player — if `dx² + dz² < PICKUP_RANGE²` with `PICKUP_RANGE = 1.9`, call `collect(pick)`.

**Collection** (`:106-130`): marks `taken = true` immediately (no double-collect), dispatches the kind-specific hook, then plays a pop animation on an independent `requestAnimationFrame` loop: each frame the group shrinks by 0.2 (floor 0.01) and rises 0.06 until scale ≤ 0.05, at which point it's removed from the parent group and all child geometries/materials are disposed. Because it uses raw rAF, the pop finishes even while the game is paused.

## Data Structures

```ts
interface Pickup {           // :6-13
  group: Group               // scene object (crate + band)
  kind: 'weapon' | 'ammo'
  weaponId?: string          // weapons only
  taken: boolean             // collected flag; entry stays in the array
  bobPhase: number           // animation phase offset
  fillMat: MeshStandardMaterial // kept for future tinting (unused after spawn)
}
```

Storage is a single flat `pickups: Pickup[]` (`:26`) under one parent Group (`:27`). No spatial index — linear scan per frame.

## Public API

```ts
constructor(scene: { add(o: Group): void; remove(o: Group): void },
            playerPos: () => Vector3,
            hooks: PickupHooks = {})   // :29-35 — minimal scene contract, not a full Scene type

spawnWeapon(id: string, x: number, z: number): void // :37 — no-op for unknown ids
spawnAmmo(x: number, z: number): void               // :65
update(dt: number): void                            // :90 — animation + walk-over collection
get visibleCount(): number                          // :132 — count of untaken pickups
```

Hooks (`PickupHooks`, `:15-18`): optional `onWeapon(id: string)` and `onAmmo()`.

## Interactions

Callers:
- `Game` constructs it (`src/game/Game.ts:278`), ticks `update` (`:411`), spawns the initial world layout (`:611-617`).
- `EnemySystem.onEnemyDeath` → `pickups.spawnAmmo(enemy.position.x, enemy.position.z)` drops ammo at every corpse, thug or cop (`src/game/Game.ts:297-298`).

Callees (hook implementations in Game):
- `onWeapon(id)` → `weapons.giveWeapon(id)` + `weaponView.setWeapon(id)` + pickup audio + telemetry `weaponAcquired` + HUD toast "`<NAME> acquired!`" (`src/game/Game.ts:282-288`). `giveWeapon` grants 80% of mag capacity and +50% reserve (capped at `reserveMax`) and auto-equips (`src/systems/WeaponSystem.ts:114-122`).
- `onAmmo()` → `weapons.giveAmmo(0.4)` (+40% of every owned weapon's reserveMax, capped) + audio + telemetry + "+ AMMO" toast (`src/game/Game.ts:289-294`; `src/systems/WeaponSystem.ts:124-128`).
- Player position comes from the injected closure `() => this.player.position` (`src/game/Game.ts:280`); note this tracks the *player entity*, so pickups aren't collectible while driving (the car body simply never gets within 1.9 m of the ground marker's XZ center unless driven over precisely).

## Tuning & Extension Points

Actual constants:

| Constant | Value | Where |
|---|---|---|
| `PICKUP_RANGE` | 1.9 m (squared compare) | `src/systems/PickupSystem.ts:4,100` |
| bob speed / amplitude | 2.2 rad/s · ±0.12 m around y=0.5 | `:94-95` |
| spin speed | 1.4 rad/s | `:96` |
| pop shrink step / rise | −0.2 scale & +0.06 y per rAF frame | `:116-117` |
| weapon crate size/color | 0.8³-ish, band from `WEAPONS[id].color` | `:43-53` |
| initial world spawns | smg(−14,14), shotgun(14,−14), rifle(45,−30), ammo(−20,−20),(30,40) | `src/game/Game.ts:612-616` |

Extension points: new pickup kinds need a `kind` union member, a `spawn*` builder, and a hook; the constructor's structural `{ add, remove }` scene type makes it testable headless.

## Unresolved

- Collected pickups are never removed from the array (`taken` entries skipped forever, `:93`) and `visibleCount` re-filters on each access (`:133`) — negligible at current counts but unbounded if enemies die en masse.
- Collection radius ignores Y entirely (`:98-100`): a pickup directly below/above the player within 1.9 m horizontally still collects; harmless at ground level.
- The pop animation runs on `requestAnimationFrame` outside the game loop (`:129`), so pausing mid-pop lets it finish — visually fine, but it disposes materials while the render loop could still be drawing that frame.
- Weapon pickups don't respawn; once taken, only enemy ammo drops replenish supply (`src/game/Game.ts:297-298`).
