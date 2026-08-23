# AudioManager

## Purpose

Procedural Web Audio sound manager for all game SFX, ambience, engine audio and spatialization (`src/systems/AudioManager.ts:4-11`). It generates every sound at runtime from oscillators/noise buffers — there are no audio files — so it works sandbox-safe offline. It owns a single lazy-initialized `AudioContext`, a master gain with mute support, a looping city ambience bed, a speed-pitched engine drone, and camera-relative 3D panning for world-position sounds.

## Execution Flow

**Construction** — `new AudioManager()` in the `Game` constructor does *nothing* audible; it only sets state fields (`src/game/Game.ts:148`, `src/systems/AudioManager.ts:13-20`). No `AudioContext` is created yet because browsers block audio until a user gesture.

**Unlock** — `Game` registers one-shot `pointerdown`/`keydown` window listeners whose sole job is calling `audio.ensure()`; they remove themselves after first fire (`src/game/Game.ts:328-335`). `ensure()` (`AudioManager.ts:23-39`) either resumes a suspended existing context or:
1. picks `window.AudioContext` with a `webkitAudioContext` fallback (`AudioManager.ts:29`),
2. creates the context,
3. creates `master = createGain()` with `gain.value = 0.8` connected to `destination` (`AudioManager.ts:32-34`),
4. calls `startAmbient()` to start the looping city-noise bed (`AudioManager.ts:35`, `254-277`).
Any exception leaves `ctx = null` and every later method no-ops via its `if (!ctx || !this.master) return` guard (`AudioManager.ts:118` et al.).

**Per-frame** — two call sites inside `Game.update()`:
- `audio.setListener(camera.position, camera.quaternion)` runs first thing every frame so the WebAudio listener tracks the camera (`src/game/Game.ts:387`). It rotates local `(0,0,-1)`/`(0,1,0)` basis vectors by the camera quaternion using reusable scratch `Vector3`s (`AudioManager.ts:55-56, 111-112`) and writes them through the modern `positionX/forwardX/upX…` AudioParams, falling back to legacy `setPosition()`/`setOrientation()` when those don't exist (`AudioManager.ts:57-70`).
- `updateEngineAudio()` (`src/game/Game.ts:483-491`) calls `setEngine(!v.wrecked, Math.abs(v.speed) / v.config.maxSpeed)` when driving, else `setEngine(false, 0)`; it also toggles mute on `KeyM` (`src/game/Game.ts:490`).

**Event-driven SFX** — everything else fires from gameplay hooks wired in `Game`: shoot (`Game.ts:250`), hit (`Game.ts:247`), kill (`Game.ts:267`), reload (`Game.ts:271`), empty click (`Game.ts:272`), pickups (`Game.ts:285, 291`), mission complete jingle (`Game.ts:218`), explosion at wrecked vehicles (`Game.ts:475`), and damage taken from traffic collisions (`Game.ts:517, 561`) and enemy melee (`src/systems/ModeController.ts:108`).

Call chain example (gunshot): `WeaponSystem.fire()` → `hooks.onShoot(weapon)` (`src/systems/WeaponSystem.ts` wired at `Game.ts:249`) → `audio.playShoot(def)` → procedural noise buffer → filter → gain → `master`.

## Data Structures

| Field | Type | Meaning |
|---|---|---|
| `muted` | `boolean` (public) | Mute flag; read/written by `KeyM` handler and pause menu (`src/game/Game.ts:232-233, 490`) |
| `ctx` | `AudioContext \| null` (private) | Lazily created context; `null` = all methods no-op |
| `master` | `GainNode \| null` (private) | Master output node, base gain `0.8`; mute ramps it to `0` |
| `engineOsc` | `OscillatorNode \| null` (private) | Sawtooth engine oscillator, created on demand |
| `engineGain` | `GainNode \| null` (private) | Engine volume envelope |
| `engineFilter` | `BiquadFilterNode \| null` (private) | Engine lowpass, frequency follows speed |
| `engineOn` | `boolean` (private) | Whether the engine graph currently exists (drives delayed teardown) |
| `ambientGain` | `GainNode \| null` (private) | Ambience bed volume node |
| `tmpFwd`/`tmpUp` | `Vector3` (private, reused) | Scratch vectors for listener orientation — no per-frame allocation |

There are no exported interfaces; `playShoot` takes a `WeaponDef` (from `src/data/weapons`) and reads `.id`.

## Public API

| Method | Behavior |
|---|---|
| `ensure(): void` | Create/resume the `AudioContext`. Must be called from a user gesture (`AudioManager.ts:22-39`). Idempotent; resumes if suspended. |
| `setMuted(muted: boolean): void` | Sets `this.muted` and ramps master gain to `0` (muted) or `0.8` (unmuted) via `setTargetAtTime(..., 0.05)` time constant (`AudioManager.ts:41-46`). |
| `setListener(pos: Vector3, quat: Quaternion): void` | Glue the WebAudio listener to the camera; call every frame (`AudioManager.ts:50-71`). |
| `playShoot(weapon: WeaponDef): void` | White-noise gunshot; duration `0.18s` for `id === 'shotgun'`, else `0.09s`; lowpass cutoff `900` (shotgun) / `1400` (rifle) / `2200` Hz (other); gain `0.5 → 0.001` exponential decay (`AudioManager.ts:116-137`). Non-positional (player's own gun). |
| `playHit(): void` | Blip `180Hz square, 0.07s, vol 0.12` (`AudioManager.ts:155-157`). |
| `playKill(): void` | Two overlapping blips: `300Hz sawtooth 0.12s @0.18` + `150Hz square 0.18s @0.15` (`AudioManager.ts:159-162`). |
| `playReload(): void` | `500Hz square 0.06s @0.10`, second `700Hz` identical blip via `setTimeout` after `120ms` (`AudioManager.ts:164-167`). |
| `playPickup(): void` | `660Hz sine 0.09s @0.22`, then `990Hz sine 0.14s` after `90ms` (`AudioManager.ts:169-172`). |
| `playDamage(): void` | `120Hz sawtooth 0.22s @0.30` (`AudioManager.ts:174-176`). |
| `playEmpty(): void` | Dry-fire click `900Hz square 0.04s @0.08` (`AudioManager.ts:178-180`). |
| `playExplosion(): void` | Non-spatial explosion: `0.7s` white-noise buffer shaped `pow(1-t, 1.5)`, lowpass sweep `3000 → 120Hz`, gain `0.9 → 0.001` (`AudioManager.ts:182-204`). |
| `playExplosionAt(pos: Vector3): void` | Same synthesis as above plus an `equalpower` panner with `distanceModel 'inverse'`, `refDistance 6`, `maxDistance 120`, `rolloffFactor 1.4`, placed at `pos` (`AudioManager.ts:73-109`). |
| `playMissionComplete(): void` | Three-note fanfare `523/659/784 Hz` sine, at `t+0/+120/+240ms`, durations `0.12/0.12/0.24s`, vols `0.2/0.2/0.22` (`AudioManager.ts:206-210`). |
| `setEngine(active: boolean, speedRatio: number): void` | On first `active`, builds `sawtooth` osc (`55Hz`) → lowpass (`300Hz`) → gain (`0`) chain (`AudioManager.ts:217-229`). Each call smooth-ramps (time constant `0.1s`): gain to `active ? 0.05 + speedRatio*0.09 : 0`, pitch to `50 + speedRatio*90 Hz`, filter to `250 + speedRatio*500 Hz` (`AudioManager.ts:230-234`). On deactivation schedules graph teardown after `600ms`, skipped if re-entered meanwhile (`AudioManager.ts:235-250`). `speedRatio` is expected in `[0,1]` (clamping is caller's problem). |

Private helper `blip(freq, dur, type, vol = 0.2)` (`AudioManager.ts:139-153`) synthesizes one oscillator whose frequency exponentially ramps to `freq * 1.4` with matching gain decay — the basis of most UI/combat cues.

## Interactions

**Called by:**
- `Game.ts` — constructor wiring of all weapon/pickup/mission callbacks (`Game.ts:218-296`), gesture unlock (`Game.ts:330`), per-frame listener + engine updates (`Game.ts:387, 486-490`), wreck explosions (`Game.ts:475`), collision damage (`Game.ts:517, 561`), destroy-time save unaffected (no audio shutdown — the context simply dies with the page).
- `ModeController.ts` — melee damage cue via injected dependency (`src/systems/ModeController.ts:36, 108`).
- `PauseMenu` indirectly — mute toggle callback closes over `audio.setMuted(!audio.muted)` (`src/game/Game.ts:232-233`).

**Calls out to:** browser Web Audio API only (`AudioContext`/`webkitAudioContext`, buffers, filters, panners); imports `Quaternion`/`Vector3` from three and the `WeaponDef` type from `src/data/weapons` (`AudioManager.ts:1-2`).

**State exchanged:** none stored; purely imperative method calls. The mute flag is mirrored into `PauseMenu`'s button label through the `isMuted` closure (`Game.ts:233`).

## Tuning & Extension Points

Constants worth knowing when tweaking feel:

- Master volume: `0.8` (`AudioManager.ts:33`); mute ramp time constant `0.05s` (`AudioManager.ts:44`).
- Gunshot: shotgun dur `0.18s` / others `0.09s` (`AudioManager.ts:120`); cutoffs `900/1400/2200 Hz` keyed off `weapon.id === 'shotgun' | 'rifle'` (`AudioManager.ts:130`); peak gain `0.5`.
- Explosion: dur `0.7s`, lowpass `3000→120Hz` sweep, peak `0.9`, noise exponent `1.5` (`AudioManager.ts:78-105`).
- Panner: `refDistance 6`, `maxDistance 120`, `rolloffFactor 1.4` (`AudioManager.ts:93-95`).
- Engine: idle gain `0.05`, max extra `+0.09·ratio`; pitch `50→140 Hz`; filter `250→750 Hz`; fade time constant `0.1s`; teardown delay `600ms` (`AudioManager.ts:231-249`).
- Ambience: 2s loop, brown-noise integrator `last = (last + 0.02*white)/1.02`, output scaled `×3.5`, gain `0.05`, lowpass `400Hz` (`AudioManager.ts:258-275`).

Extension guidance:
- Add new one-shot cues as thin wrappers around `blip()` — that is the established pattern (`AudioManager.ts:155-180`).
- Add new positional effects by copying the `playExplosionAt` panner block to keep distance falloff consistent.
- New continuous loops (e.g. rain hiss) belong next to `startAmbient()` and should connect through `master` so mute covers them.
- Do **not** call `ensure()` outside a user-gesture handler or the context stays suspended.

## Unresolved

- `playExplosion()` (`AudioManager.ts:182-204`) is a byte-for-byte duplicate of `playExplosionAt()` minus the panner; unclear whether it is still called anywhere (only `playExplosionAt` appears in `Game.ts`) — likely dead code kept for symmetry.
