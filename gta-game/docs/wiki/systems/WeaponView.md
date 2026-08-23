# WeaponView

Source: `src/systems/WeaponView.ts`

## Purpose

Third-person weapon viewmodel: a procedural box/cylinder gun model per weapon, parented to the player character's right hand, with recoil kick on fire, movement bob while walking, and an additive muzzle flash. Purely cosmetic — it never affects hit detection (WeaponSystem rays from the camera, src/systems/WeaponSystem.ts:208-209). Header comment calls it the "bloodwave viewmodel pattern, adapted to the 3rd-person camera" (src/systems/WeaponView.ts:16-21).

## Execution Flow

**Init** — constructor positions `holder` at `HOLD_POS (0.42, 1.02, 0.18)` with pitch `HOLD_ROT_X = -0.12` (slight downward aim) (src/systems/WeaponView.ts:13-14, 32-33); builds one hidden model per `WEAPONS` entry and parents them all to the holder (src/systems/WeaponView.ts:35-40); creates the muzzle flash mesh and defaults to `'pistol'` via `setWeapon` (src/systems/WeaponView.ts:43-55). The holder is added to `player.group` in Game construction (src/game/Game.ts:186-187), so it inherits player position/yaw automatically.

**Per-frame** — `update(dt, moving, speedRatio)` (src/systems/WeaponView.ts:68-92), called from `Game.update` (src/game/Game.ts:441-443):

1. Recoil decay: `kickAmount -= dt * 7` clamped at 0 (~143 ms kick); holder offset by `k * 0.12` on z (kick toward camera), `k * 0.015` on x, and `k * 0.14` extra downward pitch (src/systems/WeaponView.ts:70-74).
2. Movement bob (only when `moving`): `bobTime += dt * (6 + speedRatio * 10)`; vertical bob `|sin(bobTime)| * 0.02`; roll `sin(bobTime * 0.5) * 0.012` applied to `rotation.z` (src/systems/WeaponView.ts:77-82).
3. Idle settle: when not moving, `position.y` and `rotation.z` damp back to rest with `MathUtils.damp(..., 8, dt)` (src/systems/WeaponView.ts:83-86).
4. Muzzle flash decay: `flash -= dt * 14` (~71 ms); material opacity `= flash * 0.9`, scale `= 0.7 + flash * 0.6` (src/systems/WeaponView.ts:89-91).

Caller arguments (src/game/Game.ts:442-443): `moving` is true only in foot mode with horizontal speed > 0.5 m/s; `speedRatio = min(1, speed / 9.5)` where 9.5 matches `SPRINT_SPEED` (src/entities/Player.ts:17), so bob frequency scales with walk→sprint.

**Model building** — `buildModel(def)` (src/systems/WeaponView.ts:95-143) assembles each gun from a local `box(w,h,d,mat,x,y,z)` helper (BoxGeometry meshes) and `cyl(rt,rb,h,...)` helper (CylinderGeometry with 10 radial segments, pitched π/2 to lie along z) (src/systems/WeaponView.ts:101-111). Materials: body metal tinted with `def.color` (roughness 0.45, metalness 0.7), dark parts `0x1a1a1f` (roughness 0.7), brass accent `0xc9a227` (metalness 0.6) (src/systems/WeaponView.ts:97-99).

## Data Structures

- `holder: Group` (readonly, exposed) — single anchor parented to the player; carries recoil/bob transforms.
- `models: Map<string, Group>` — one assembled gun per weapon id, toggled by visibility (src/systems/WeaponView.ts:24, 35-40).
- `muzzle: Mesh` / `muzzleMat: MeshBasicMaterial` — flash quad; `BoxGeometry(0.16, 0.16, 0.16)`, color `0xffdd66`, `blending: 2` (AdditiveBlending), depthWrite false, positioned at `(0, 0.02, -0.55)` relative to grip and rotated π/4 around z for a diamond silhouette (src/systems/WeaponView.ts:43-53).
- Scalar animation state: `kickAmount`, `flash`, `bobTime` (src/systems/WeaponView.ts:27-29).
- Constants: `HOLD_POS = (0.42, 1.02, 0.18)`, `HOLD_ROT_X = -0.12` (src/systems/WeaponView.ts:13-14).

## Public API

- `holder: Group` — attach point; Game adds it to `player.group` (src/game/Game.ts:187).
- `setWeapon(id: string): void` — shows exactly the named model, hides all others (src/systems/WeaponView.ts:58-60).
- `kick(): void` — triggers one recoil + flash cycle; called from the WeaponSystem `onShoot` hook every shot regardless of weapon type (src/systems/WeaponView.ts:62-66; src/game/Game.ts:251).
- `update(dt: number, moving: boolean, speedRatio: number): void` — advances recoil decay, bob, and flash fade (src/systems/WeaponView.ts:68).

## Interactions

- Game constructs it, attaches `holder` to the player group, and updates it every frame after mode resolution (src/game/Game.ts:186-187, 441-443).
- `setWeapon` call sites: pickup collection (`onWeapon` hook, src/game/Game.ts:284), digit-key switching in ModeController (src/systems/ModeController.ts:96), and post-load restore to `weapons.currentWeaponId` (src/game/Game.ts:303).
- `kick()` is fired from the weapon `onShoot` hook alongside audio and pedestrian panic (src/game/Game.ts:249-251).
- Hidden while driving for free: `enterVehicle` sets `player.group.visible = false` (src/systems/ModeController.ts:181), which hides the childed holder — no explicit view code involved (noted in the class docstring, src/systems/WeaponView.ts:20).
- Model geometry mirrors `WEAPONS[id].color` only; all other shapes are hard-coded per id (pistol/smg/shotgun/rifle cases, src/systems/WeaponView.ts:113-141).

## Tuning & Extension Points

Actual values:

- Recoil: decay rate 7/s; kick offsets z 0.12, x 0.015, pitch 0.14 rad (src/systems/WeaponView.ts:70-74).
- Bob: base rate 6 Hz + up to 10 Hz more at sprint; amplitudes y 0.02 m, roll 0.012 rad (src/systems/WeaponView.ts:78-82); idle damp λ 8 (src/systems/WeaponView.ts:84-85).
- Flash: decay 14/s (~71 ms life), peak opacity 0.9, scale range 0.7–1.3 (src/systems/WeaponView.ts:89-91).
- Hold pose: `(0.42, 1.02, 0.18)`, pitch −0.12 (src/systems/WeaponView.ts:13-14).
- Extension points: add a `case` in `buildModel`'s switch keyed by the new `WEAPONS` id (src/systems/WeaponView.ts:113-141); the model auto-registers because the constructor iterates all of `WEAPONS` (src/systems/WeaponView.ts:35-40).

## Unresolved

- `WeaponDef.recoil` exists per weapon (e.g. shotgun 0.05 vs SMG 0.008, src/data/weapons.ts:53,70) but `kick()` uses fixed magnitudes for every weapon — no per-weapon kick scaling anywhere in `src/`.
- The docstring says "additive billboard", but the muzzle flash is a static world-aligned **box**, never rotated toward the camera (src/systems/WeaponView.ts:42-53).
- No per-weapon hold pose or two-handed grip: every weapon shares `HOLD_POS`.
- Gun models use `MeshStandardMaterial` and depend on scene lights; no emissive component, so at night the viewmodel relies entirely on ambient/moon lighting (src/systems/WeaponView.ts:97-99).
