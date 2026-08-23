# WeaponSystem

Source: `src/systems/WeaponSystem.ts`

## Purpose

Hitscan shooting: camera-crosshair raycasts against environment AABBs, enemy capsules and pedestrian "soft targets", with data-driven weapon defs, per-weapon mag/reserve ammo, timed reloads, auto-fire for automatic weapons, auto-reload on empty, plus self-managed transient tracer/impact/blood effects. Design lineage noted in the header comment: "bloodwave shooting.js pattern" (src/systems/WeaponSystem.ts:48-54).

## Execution Flow

**Init** — constructor stores deps (scene, camera, input, `EnemySystem`, a collidables provider, hooks, an extra-targets provider) and seeds one full `AmmoState` (`mag = magSize`, `reserve = reserveMax`, timers 0) for every entry in `WEAPONS` (src/systems/WeaponSystem.ts:73-81). Player starts owning only the pistol (src/systems/WeaponSystem.ts:59); `currentWeaponId = 'pistol'` (src/systems/WeaponSystem.ts:57).

**Per-frame** — `update(dt)` (src/systems/WeaponSystem.ts:173-194), driven from `Game.update` (src/game/Game.ts:412):

1. `fireTimer -= dt` (src/systems/WeaponSystem.ts:175).
2. If reloading, decrement `reloadTimer`; at <= 0 call `finishReload()` which transfers `min(magSize - mag, reserve)` rounds from reserve to mag (src/systems/WeaponSystem.ts:177-180, 275-282).
3. Fire gate: only when `enabled && fireTimer <= 0 && !reloading` (src/systems/WeaponSystem.ts:182). Automatic weapons hold-fire while `input.isMouseDown() && !input.isDragging()`; semi-autos consume a discrete click via `input.consumeClick()` (src/systems/WeaponSystem.ts:183-186). Drag-threshold is 8 px of accumulated mouse travel (src/utils/InputManager.ts:132-134), so orbiting the camera never fires.
4. Auto-reload when mag is empty, not already reloading, reserve > 0, and `fireTimer <= -0.25` — i.e. 0.25 s after the last shot so the empty-click plays first (src/systems/WeaponSystem.ts:189-191).
5. `updateEffects(dt)` fades/disposes transient meshes (see below).

**Shot resolution** — private `fire()` (src/systems/WeaponSystem.ts:196-273):

1. Empty mag → `hooks.onEmpty?.()` + immediate `startReload()` if reserve remains (src/systems/WeaponSystem.ts:199-203). Otherwise `mag--`, `fireTimer = def.fireRate`, `hooks.onShoot(def)` (src/systems/WeaponSystem.ts:204-206).
2. Ray origin is the live camera position, base direction `camera.getWorldDirection(...)` normalized — shots go exactly where the crosshair points, not where the gun model points (src/systems/WeaponSystem.ts:208-209).
3. Per pellet (`def.pellets`): clone the base dir and jitter `.x` and `.y` by `(Math.random() - 0.5) * def.spread`, then renormalize — spread is applied on world X/Y axes pre-normalization, not camera-space (src/systems/WeaponSystem.ts:215-219).
4. Environment occlusion: nearest `rayAABB` hit over all collidables (buildings + parked/stolen vehicles, provided by the constructor's `getCollidables` callback), capped at `def.range` (src/systems/WeaponSystem.ts:221-226; wiring src/game/Game.ts:243). `rayAABB` is the slab method returning entry-t (src/utils/raycast.ts:9-35).
5. Enemies: `rayCapsule(origin, dir, enemy.position, enemy.hitRadius, enemy.hitHeight, envT)` per alive enemy, nearest t wins (src/systems/WeaponSystem.ts:229-237). `rayCapsule` approximates a vertical capsule with 4 spheres sampled at axis fractions `[0.08, 0.38, 0.68, 0.95]`, each sphere radius inflated ×1.15 to close gaps between samples (src/utils/raycast.ts:61-81).
6. Extra soft targets (pedestrians): same capsule test but against the current best distance, so the nearest of {environment, enemy, pedestrian} wins; a pedestrian hit clears any enemy hit (src/systems/WeaponSystem.ts:239-248). Default body height if unspecified is 1.8 m (src/systems/WeaponSystem.ts:35-36).
7. Damage application: enemies via `enemies.damageEnemy(enemy, def.damage)` + blood flash (life 0.35 s) (src/systems/WeaponSystem.ts:251-255); pedestrians via `target.takeDamage(def.damage)` + blood flash, kill recorded with kind `'civilian'` (src/systems/WeaponSystem.ts:256-263). Environment-only hits spawn a spark (life 0.12 s) only when `envT < def.range - 0.05`, suppressing sparks for rays that hit nothing (src/systems/WeaponSystem.ts:264-266). Damage is flat within range — there is no distance falloff anywhere in the file.
8. A tracer mesh spawns only for pellet index 0 (shotgun shows one beam, not six) (src/systems/WeaponSystem.ts:268).
9. Hooks coalesce per trigger pull: one `onHit` if anything was damaged, one `onKill(lastKillKind)` if anything died (civilian kind wins ties since it is assigned last) (src/systems/WeaponSystem.ts:271-272).

**Transient effects** — tracers are `BoxGeometry(0.03, 0.03, len)` stretched along the ray, midpoint-positioned, oriented via `setFromUnitVectors((0,0,1), dir)`, opacity 0.85, lifetime 0.09 s; skipped entirely if ray length < 0.1 (src/systems/WeaponSystem.ts:286-298). Impact flashes are low-poly spheres (`SphereGeometry(0.18 | 0.09, 6, 5)`), blood `0x9b111e`, spark `0xffd166`, opacity 0.95 (src/systems/WeaponSystem.ts:300-312). Every effect gets fresh geometry+material (not pooled) and both are disposed on expiry (src/systems/WeaponSystem.ts:314-317, 324-327). While alive they fade `opacity = (life/maxLife) * 0.9` and grow by up to 1.2× — growth applies only when `maxLife > 0.2`, i.e. blood grows, sparks/tracers do not (src/systems/WeaponSystem.ts:330-335).

## Data Structures

- `AmmoState` — `{ mag, reserve, reloading: boolean, reloadTimer, fireTimer }` per weapon id (src/systems/WeaponSystem.ts:17-23).
- `ammo: Map<string, AmmoState>` keyed by weapon id (src/systems/WeaponSystem.ts:58).
- `owned: Set<string>` — inventory; seeded with `'pistol'` (src/systems/WeaponSystem.ts:59).
- `effects: TransientEffect[]` — `{ obj: Object3D, life, maxLife }` scratch list, iterated back-to-front with splice removal (src/systems/WeaponSystem.ts:25-29, 60, 320).
- `tmpOrigin` / `tmpDir` reused Vector3s for the ray; per-pellet dirs are cloned (src/systems/WeaponSystem.ts:61-62, 216).
- `ShootableTarget` — duck-typed target contract: feet `position`, `hitRadius`, optional `hitHeight` (default 1.8), `takeDamage(amount): boolean` returning killed (src/systems/WeaponSystem.ts:32-38). Implemented by `Enemy` (health 100, radius 0.62, height 1.8 — src/systems/EnemySystem.ts:20, 27, 30-31) and `Pedestrian` (radius 0.38, height 1.8 — src/systems/PedestrianSystem.ts:46-47).
- `WeaponHooks` — `{ onHit?, onKill?(kind: 'enemy'|'civilian'), onShoot?(weapon), onReload?, onEmpty? }` (src/systems/WeaponSystem.ts:40-46).

## Public API

- `enabled: boolean` — master kill-switch; ModeController sets it false while driving (src/systems/WeaponSystem.ts:56; src/systems/ModeController.ts:90, 149).
- `currentWeaponId: string` (src/systems/WeaponSystem.ts:57).
- `get currentDef(): WeaponDef` — def lookup for HUD/audio (src/systems/WeaponSystem.ts:84-86).
- `get currentState/mag/reserve/reloading` — current weapon's ammo state; `currentState` falls back to the first map entry if missing (src/systems/WeaponSystem.ts:88-102).
- `get reloadProgress(): number` — 0..1, computed as `1 - reloadTimer / reloadTime`, always 0 when not reloading (src/systems/WeaponSystem.ts:104-108).
- `hasWeapon(id)` (src/systems/WeaponSystem.ts:110-112).
- `giveWeapon(id)` — ignores unknown ids; adds to owned; raises mag to `max(mag, floor(magSize * 0.8))`; adds `floor(reserveMax * 0.5)` reserve capped at max; auto-equips (src/systems/WeaponSystem.ts:114-122).
- `giveAmmo(fraction = 0.4)` — refills **all** owned-and-not-owned weapons' reserves by `floor(reserveMax * fraction)`, capped at `reserveMax` (src/systems/WeaponSystem.ts:124-129).
- `serialize(): { owned, current, ammo }` / `deserialize(data)` — save-game snapshot; deserialize validates ids against `WEAPONS`, clamps counts to `magSize`/`reserveMax`, and force-clears reload state (src/systems/WeaponSystem.ts:131-153).
- `switchWeapon(id)` — no-op unless owned and different; cancels an in-progress reload without refunding progress (src/systems/WeaponSystem.ts:155-163).
- `startReload()` — no-op if reloading / reserve empty / mag full; sets `reloadTimer = reloadTime`, fires `onReload` (src/systems/WeaponSystem.ts:165-171).
- `update(dt)` (src/systems/WeaponSystem.ts:173).

## Interactions

- Constructed once in `Game` with scene/camera/input/enemies, `() => world.getCollidables().concat(vehicles.getCollidables())` as the environment provider, the game hooks, and `() => pedestrians.alive` as extra targets (src/game/Game.ts:238-275).
- Hook wiring in Game: `onHit` → `game.onWeaponHit` (HUD hit-marker flash via main.ts:62 → hud.ts:66-68) + `audio.playHit`; `onShoot` → `audio.playShoot(weapon)`, `weaponView.kick()`, `pedestrians.panicNear(playerPos, 40)`, and wanted-level crime report (+1) if any living cop is within 55 m (squared-distance check) (src/game/Game.ts:245-264); `onKill` → `kills++`, `audio.playKill`, telemetry, civilian kills raise wanted +2 (src/game/Game.ts:265-270); `onReload`/`onEmpty` → audio (src/game/Game.ts:271-272).
- PickupSystem: weapon pickups call `giveWeapon(id)`, ammo pickups call `giveAmmo(0.4)` (src/game/Game.ts:282-294; pickup collection src/systems/PickupSystem.ts:106-112). Dead enemies drop ammo pickups through `enemies.onEnemyDeath` (src/game/Game.ts:297-299).
- EnemySystem: `damageEnemy` delegates to `enemy.takeDamage` and fires `onEnemyDeath` on kill (src/systems/EnemySystem.ts:303-307); enemies respawn 20 s after death (src/systems/EnemySystem.ts:80).
- ModeController owns weapon input on foot: Digit1-4 → `switchWeapon` + `weaponView.setWeapon`, KeyR → `startReload` (src/systems/ModeController.ts:93-99); disables firing while driving (src/systems/ModeController.ts:149).
- SaveManager round-trip: `weapons.serialize()` stored on every autosave (30 s) and destroy, restored on boot (src/game/Game.ts:572-580, 589, 428-433).
- HUD reads `currentDef.name`, `mag`, `reserve`, `reloading`, `reloadProgress` each frame while on foot and alive (src/ui/hud.ts:110-119).

## Tuning & Extension Points

All numbers below are actual values from code.

- Weapons (src/data/weapons.ts): pistol dmg 34, mag 12, reserve 60, reload 1.1 s, fireRate 0.28 s, semi, spread 0.012, pellets 1, recoil 0.012, range 120, key '1' (src/data/weapons.ts:24-40); SMG dmg 18, mag 30, reserve 120, reload 1.6 s, fireRate 0.085 s (~11.8 rps, full-auto), spread 0.028, recoil 0.008, range 100, key '2' (src/data/weapons.ts:41-57); shotgun dmg 16 ×6 pellets, mag 8, reserve 40, reload 2.6 s, fireRate 0.9 s, spread 0.09, recoil 0.05, range 45, key '3' (src/data/weapons.ts:58-74); rifle dmg 30, mag 24, reserve 96, reload 2.0 s, fireRate 0.11 s, full-auto, spread 0.018, recoil 0.012, range 160, key '4' (src/data/weapons.ts:75-91). Tracer colors 0xffe9a0 / 0xffd27a / 0xfff2b0.
- Auto-reload delay after last shot: 0.25 s (src/systems/WeaponSystem.ts:189).
- Weapon-pickup grant fractions: 0.8 of mag, 0.5 of reserve (src/systems/WeaponSystem.ts:119-120); ammo pickup fraction 0.4 (src/systems/WeaponSystem.ts:124).
- Effect lifetimes: tracer 0.09 s (src/systems/WeaponSystem.ts:297), blood 0.35 s (src/systems/WeaponSystem.ts:253,258), spark 0.12 s (src/systems/WeaponSystem.ts:265).
- Effect fade multiplier 0.9; grow amount 1.2 for effects longer than 0.2 s (src/systems/WeaponSystem.ts:333-334).
- Spark-suppression margin: `range - 0.05` (src/systems/WeaponSystem.ts:264).
- Extension points: new weapons need only a `WEAPONS` entry + a `WeaponView.buildModel` case (src/systems/WeaponView.ts:113-141); new soft targets just implement `ShootableTarget` and get added via the constructor's `getExtraTargets` callback (src/systems/WeaponSystem.ts:71).

Cross-checked runtime fact: pistol HUD reading 11/48 is consistent with these paths — start 12/60 → dump 12 rounds → auto-reload moves 12 from reserve (60→48, mag 12) → fire once → 11/48.

## Unresolved

- `WeaponDef.recoil` (src/data/weapons.ts:16) is declared but never read anywhere in `src/` — camera pitch kick is not implemented; the only recoil feedback is the fixed-magnitude `WeaponView.kick()`.
- Effects allocate geometry/material per shot and dispose on expiry (src/systems/WeaponSystem.ts:291-294, 324-327) — sustained SMG fire churns GPU resources; pooling like ParticleSystem would remove it.
- Spread jitter uses world axes, so effective cone shape varies slightly with aim direction (src/systems/WeaponSystem.ts:217-218).
- No damage falloff, headshot multipliers, or friendly-fire checks vs pedestrians other than wanted-level consequences.
