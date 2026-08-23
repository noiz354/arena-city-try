# ParticleSystem

Source: `src/systems/ParticleSystem.ts`

## Purpose

Pooled additive-blended quad particles for explosions, sparks, and smoke. Header cites "interstellar-armada pools.js + SYNTHBLAST Particle patterns" with the explicit goal of zero allocation during gameplay after construction (src/systems/ParticleSystem.ts:15-19). Used for vehicle explosions and burning-wreck smoke (src/game/Game.ts:470-480).

## Execution Flow

**Init** — constructor takes the `Scene` and pre-creates `POOL_SIZE = 140` particle records, all sharing one `PlaneGeometry(0.5, 0.5)` but each owning its own `MeshBasicMaterial` (`transparent`, `depthWrite: false`, `blending: 2` = AdditiveBlending, opacity 0). Every mesh is added to the scene immediately but `visible = false` (src/systems/ParticleSystem.ts:24-45). All 140 meshes render-list permanently; toggling visibility is the only activation cost.

**Emission** — private `burst(pos, color, speed, life, gravity, count)` pops particles off the pool stack and returns silently if the pool is empty (early `return` per particle, src/systems/ParticleSystem.ts:63-65). Per particle: random azimuth over the full circle, speed `Math.random() * speed`; velocity `(cos(a)*v, (rand - 0.2)*speed, sin(a)*v)` — the y-bias makes 80% of particles start rising (src/systems/ParticleSystem.ts:66-68); lifetime jittered to `life * (0.6 + rand * 0.7)` (src/systems/ParticleSystem.ts:69); `scaleVel` fixed at 1.5 (src/systems/ParticleSystem.ts:71); initial scale `0.4 + rand * 0.8`, opacity 0.95 (src/systems/ParticleSystem.ts:74-76).

**Per-frame** — `update(dt)` iterates `active` back-to-front (src/systems/ParticleSystem.ts:95-113):

1. Expired (`life <= 0`): hide mesh, push back to pool, splice from active (src/systems/ParticleSystem.ts:99-103).
2. Integrate: `vel.y += gravity * dt` then `position += vel * dt` (src/systems/ParticleSystem.ts:105-106).
3. Fade: `opacity = max(0, (life / maxLife) * 0.9)` (src/systems/ParticleSystem.ts:107-108).
4. Grow: `scale *= 1 + scaleVel * dt` (~×2.6 over one second at scaleVel 1.5) (src/systems/ParticleSystem.ts:109).
5. Smoke tint: particles flagged by *negative* gravity lerp their color toward `SMOKE_COLOR 0x888899` at rate `dt * 0.4` (src/systems/ParticleSystem.ts:110-111). Note the sign convention is inverted from physics intuition here — positive `gravity` pushes particles upward in this system.

Called once per frame from `Game.update` (src/game/Game.ts:449).

## Data Structures

- `Particle` — `{ mesh, vel: Vector3, life, maxLife, gravity, scaleVel }` (src/systems/ParticleSystem.ts:3-10).
- `pool: Particle[]` — free list used as a LIFO stack (`pop`/`push`) (src/systems/ParticleSystem.ts:21).
- `active: Particle[]` — live particles, spliced on expiry (src/systems/ParticleSystem.ts:22).
- Shared geometry + per-particle material (color/opacity mutated in place, never reallocated during play) (src/systems/ParticleSystem.ts:25-32).
- `SMOKE_COLOR = 0x888899` (src/systems/ParticleSystem.ts:13), `POOL_SIZE = 140` (src/systems/ParticleSystem.ts:12).

## Public API

- `explosion(pos: Vector3, scale = 1): void` — three-layer burst totaling **50 particles**: 26 × orange `0xff9933` (speed `8*scale`, life 0.9 s, gravity 6), 14 × yellow `0xffd166` (speed `4*scale`, life 0.6 s, gravity 2), 10 × dark `0x555566` (speed `2*scale`, life 1.6 s, gravity −1.5 → smoke-tinted) (src/systems/ParticleSystem.ts:48-52).
- `smoke(pos: Vector3, dt: number): void` — probabilistic continuous emission for wrecks: fires a single gray `0x777788` particle with probability `dt * 6` per call (expected ~6/s when called every frame); spawn point offset ±0.3 m in x/z around the source and +1.4 m up; speed 1.2, life 2.2 s, gravity 1.2 (rising) (src/systems/ParticleSystem.ts:82-93).
- `update(dt): void` — integration/fade/recycle loop (src/systems/ParticleSystem.ts:95).
- `dispose(): void` — hides and removes all meshes from the scene, disposes geometry and each material, clears both arrays (src/systems/ParticleSystem.ts:115-124).

Pool exhaustion semantics: an explosion demands 50 free particles out of 140; if fewer remain, `burst` emits what it can and drops the rest without error (src/systems/ParticleSystem.ts:64-65).

## Interactions

- Constructed in Game with the shared scene (src/game/Game.ts:177); updated after weather/wet systems each frame (src/game/Game.ts:449); disposed in `Game.destroy` (src/game/Game.ts:367).
- Vehicle wrecks are the only consumer: first frame a vehicle is seen `wrecked`, Game plays `particles.explosion(v.position, 1)` + camera shake 0.9 + positional explosion audio, then calls `particles.smoke(v.position, 1/60)` every subsequent frame while it stays wrecked (src/game/Game.ts:470-481, wreck tracking via the `exploded` Set src/game/Game.ts:87,472-477). Note the caller hard-codes `1/60` as dt rather than passing real delta.
- No other system spawns through ParticleSystem — WeaponSystem has its own non-pooled tracer/flash effects (src/systems/WeaponSystem.ts:284-337); the two do not share code.

## Tuning & Extension Points

Actual values:

- Pool size 140 (src/systems/ParticleSystem.ts:12) — ceiling for simultaneous live particles.
- Explosion recipe 26/14/10 particles, speeds 8/4/2 (×scale), lives 0.9/0.6/1.6 s, gravities 6/2/−1.5 (src/systems/ParticleSystem.ts:49-51).
- Smoke emission probability `dt * 6`; wreck smoke params speed 1.2, life 2.2, gravity 1.2 (src/systems/ParticleSystem.ts:83-92).
- Lifetime jitter window ×0.6–×1.3 (src/systems/ParticleSystem.ts:69); initial scale 0.4–1.2 (src/systems/ParticleSystem.ts:74); growth rate `scaleVel` 1.5 (src/systems/ParticleSystem.ts:71); fade peak 0.9 (src/systems/ParticleSystem.ts:108); smoke color-lerp rate 0.4/s toward 0x888899 (src/systems/ParticleSystem.ts:111).
- Extension points: new effect = one public method composing existing `burst` calls with different color/speed/life/gravity arguments, following the `explosion` pattern (src/systems/ParticleSystem.ts:48-52).

## Unresolved

- Quads never billboard: `PlaneGeometry` faces +Z and no rotation is applied per-frame, so particles present edge-on from side views (src/systems/ParticleSystem.ts:25, 95-113).
- Allocation leaks despite the "zero allocation" claim: `smoke()` clones pos and news a Vector3 per emitted particle (src/systems/ParticleSystem.ts:85), and callers pass fresh positions; the hot `update` path itself is alloc-free.
- `dispose()` disposes the same shared geometry 140 times (once per particle record) — harmless in three.js but redundant (src/systems/ParticleSystem.ts:119).
- Negative-gravity "smoke" actually decelerates/descends (gravity −1.5 in `explosion`'s third layer) while wreck smoke uses positive gravity and rises; the two smoke behaviors diverge visually (src/systems/ParticleSystem.ts:51 vs 90).
- Additive blending means smoke reads as glow, not obscuring fog — fine for night scenes, weak in daylight.
