# WetSurfaceSystem

## Purpose

Couples the rain to a ground response through the single shared weather envelope `WeatherSystem.rainAmount` (`src/systems/WetSurfaceSystem.ts:19-22`). Following its source skill's "wet-puddle contract", ground roughness/gloss responds on an EARLY wetness band (`smoothstep(0.0, 0.75, rainFactor)`) while ripple rings only appear on a LATE heavy-rain band (`smoothstep(0.75, 1.0, rainFactor)`) (`src/systems/WetSurfaceSystem.ts:23-27`). The roughness response is pure material-property mutation (no shader string injection → runtime-safe); ripples are pooled expanding/fading ring meshes as a stylized proxy for analytic ripple normals (explicitly deferred). A procedural canvas puddle mask assigned as `roughnessMap` makes puddle blotches glossier than surrounding asphalt (`src/systems/WetSurfaceSystem.ts:28-33`).

## Execution Flow

**Construction** — `new WetSurfaceSystem(world.groundMaterial, () => this.weather.rainAmount)` in Game's constructor; each returned ripple mesh is added to the scene by Game (`src/game/Game.ts:171-172`). Constructor work:

1. Builds the 1024×1024 procedural puddle mask and assigns it to `ground.roughnessMap`, flagging `needsUpdate` (`src/systems/WetSurfaceSystem.ts:50-51`).
2. Creates one shared `MeshBasicMaterial` for all ripples: color `0xbfd6e8`, transparent, opacity 0, `AdditiveBlending`, `depthWrite: false` (`src/systems/WetSurfaceSystem.ts:53-59`).
3. Creates one shared `RingGeometry(0.28, 0.42, 24)`; instantiates `RIPPLE_POOL = 48` meshes sharing that geometry+material, rotated flat (`rotation.x = -π/2`), `visible = false` (`src/systems/WetSurfaceSystem.ts:60-66`).

**Per frame** — `update(dt)` called from `Game.update` after weather (`src/game/Game.ts:448`):

1. **Wetness envelope**: `wetness += (target - wetness) * (1 - exp(-0.9 * dt))` where `target = this.rainAmount()` (the closure into WeatherSystem) — a frame-rate-independent exponential approach with rate 0.9/s, deliberately slower than WeatherSystem's own damp(λ=0.8), so ground lags the air slightly (`src/systems/WetSurfaceSystem.ts:74-77`).
2. **Bands**: `roughProgress = smoothstep(0, 0.75, wetness)`, `normalProgress = smoothstep(0.75, 1, wetness)` using the local smoothstep helper (`src/systems/WetSurfaceSystem.ts:79-80,159-162`).
3. **EARLY band material response** on the shared ground `MeshStandardMaterial`: `roughness = DRY_ROUGHNESS + (WET_ROUGHNESS − DRY_ROUGHNESS)·roughProgress`; `metalness = 0.06 · roughProgress`; color lerped from white toward wet-asphalt `0x8f98a5` by `roughProgress · 0.55` (`src/systems/WetSurfaceSystem.ts:83-86`). Because `roughnessMap` is set, three.js multiplies the map with the scalar `roughness`, so puddles go glossier than plain asphalt automatically.
4. **LATE band ripples**: decrement `spawnTimer`; when `normalProgress > 0.01 && spawnTimer <= 0`, spawn a ripple and re-arm `spawnTimer = 0.5 − normalProgress·0.35` (spawn interval shrinks from 0.5 s to 0.15 s at full soak) (`src/systems/WetSurfaceSystem.ts:89-93`).
5. **Ripple aging**: visible ripples accumulate `age`; at `t = age / RIPPLE_LIFE ≥ 1` they hide; otherwise scale grows `0.4 + t·7.0` and shared-material... per-mesh opacity is written as `(1 − t) · 0.55 · normalProgress` (see Unresolved) (`src/systems/WetSurfaceSystem.ts:95-106`).

**Spawning** — `spawnRipple` picks the first invisible pool slot, places it at random `(x, z)` in `±(CITY_HALF − 8)` (i.e. ±147 m of the 310 m city, keeping an 8 m margin from the edge) at fixed height y=0.03, resets age, shows it (`src/systems/WetSurfaceSystem.ts:109-117`).

**Teardown** — `dispose()` frees the ripple material, each ripple mesh's geometry (all share one geometry — disposed once per entry, redundant but harmless), and the ground's `roughnessMap`; called from `Game.destroy` (`src/systems/WetSurfaceSystem.ts:119-123`; `src/game/Game.ts:362`).

## Data Structures

| Field | Type | Meaning |
|---|---|---|
| `wetness` | `number` | Public smoothed 0..1 wetness envelope; documented as "testable" (`src/systems/WetSurfaceSystem.ts:36-37`). Starts 0 (dry). |
| `ripples` | `private readonly Array<{ mesh: Mesh; age: number }>` | Fixed 48-entry pool; `age` in seconds since spawn (`src/systems/WetSurfaceSystem.ts:41`). |
| `rippleMat` | `private readonly MeshBasicMaterial` | Shared additive material for every ripple (opacity animated globally) (`src/systems/WetSurfaceSystem.ts:42`). |
| `spawnTimer` | `private number` | Seconds until next ripple spawn attempt (`src/systems/WetSurfaceSystem.ts:43`). |
| `baseColor` / `wetColor` | `private readonly Color` | `0xffffff` dry / `0x8f98a5` soaked asphalt tint (`src/systems/WetSurfaceSystem.ts:39-40`). |

Constants: `RIPPLE_POOL = 48`, `RIPPLE_LIFE = 1.4` s, `DRY_ROUGHNESS = 0.92`, `WET_ROUGHNESS = 0.4` (`src/systems/WetSurfaceSystem.ts:13-17`). Wetness damping rate `0.9` inline at line 77.

`buildPuddleMask()` (module-level): 1024² canvas filled white, then 90 radial-gradient blotches at random positions, radii 18–78 px, shade factor `0.35 + rand·0.4`; falls back to solid translucent squares when `createRadialGradient` is unavailable (headless/DOM-stub environments); returns an `SRGBColorSpace` `CanvasTexture` (`src/systems/WetSurfaceSystem.ts:127-157`).

## Public API

| Member | Signature | Behavior |
|---|---|---|
| `constructor` | `(ground: MeshStandardMaterial, rainAmount: () => number)` | `ground` is mutated in place (roughnessMap/metalness/roughness/color); `rainAmount` getter closure supplies the 0..1 target envelope each update. |
| `meshes` | `get meshes(): Mesh[]` | All 48 ripple meshes; the OWNER must add them to the scene (Game does, `src/game/Game.ts:172`) (`src/systems/WetSurfaceSystem.ts:69-72`). |
| `update(dt)` | `(dt: number): void` | Envelope integration + material response + ripple lifecycle. |
| `dispose()` | `(): void` | Frees ripple material/geometry and the puddle mask texture. Does NOT restore original ground material state (mask stays assigned until ground itself is disposed). |
| `wetness` | field | Read externally for tests/debugging. |

## Interactions

- **WeatherSystem** — data source: Game wires `() => this.weather.rainAmount` as the constructor closure (`src/game/Game.ts:171`); the system never imports WeatherSystem directly. This one-directional pull keeps weather unaware of ground response.
- **World.groundMaterial** — the mutated target: the same `MeshStandardMaterial` built in `World.buildGround` (initial `roughness: 0.92, metalness: 0` — matching `DRY_ROUGHNESS`; `src/game/World.ts:194-195`), exposed specifically for this coupling ("shared with WetSurfaceSystem for the rain response", `src/game/World.ts:47-48`).
- **Game** — owner: constructs, adds ripple meshes to the scene, ticks after weather (`src/game/Game.ts:171-172,448`), disposes on destroy (`src/game/Game.ts:362`).
- **CityGenerator** — reads exported `CITY_HALF` (=155, `src/systems/CityGenerator.ts:9`) for the spawn margin.
- Note: only the city ground plane gets wet; the outer terrain material (`src/game/World.ts:233`) is untouched.

## Tuning & Extension Points

All in `src/systems/WetSurfaceSystem.ts` unless noted:

- Band edges: roughness band `[0, 0.75]`, ripple band `[0.75, 1]` (lines 79-80) — moving these re-times the whole wet-vs-soaked feel.
- Roughness endpoints: `DRY_ROUGHNESS 0.92 → WET_ROUGHNESS 0.4` (lines 16-17); metalness peak `0.06` (line 84); darkening amount `0.55` toward `0x8f98a5` (lines 40, 86).
- Envelope lag rate: `0.9` s⁻¹ (line 77) vs WeatherSystem's damp λ=0.8 (`src/systems/WeatherSystem.ts:60`) — raise both together for snappier storms.
- Ripples: pool size 48, lifetime 1.4 s, geometry ring 0.28–0.42 radius / 24 segments (lines 13-14, 60), growth `0.4 + t·7` and fade `(1−t)·0.55` (lines 103, 105), spawn cadence `0.5 − normalProgress·0.35` (line 92), spawn area margin 8 m inside `CITY_HALF` (lines 112-113), lift height y=0.03 (line 114), tint `0xbfd6e8` (line 54).
- Puddle mask: blotch count 90, radius range 18–78 px, shade 0.35–0.75, canvas 1024² (lines 128-139) — regenerate per-run randomness lives here.
- Safe extensions: swap the pooled ring meshes for a shader-based normal-perturbation pass (the header notes analytic ripple normals were deferred pending browser verification, lines 29-31); to wet additional surfaces (terrain, rooftops), apply the same early-band math to their materials inside step 3 rather than constructing parallel systems.

## Unresolved

- Per-ripple opacity: `update` writes `(r.mesh.material as MeshBasicMaterial).opacity` inside the loop (line 105), but every pool mesh shares ONE material instance (lines 53, 62) — so the last iterated visible ripple's value wins each frame and all ripples flash identically rather than fading individually. Functional (they still grow/hide on schedule) but likely unintended; fixing requires per-mesh materials or vertex-color alpha.
