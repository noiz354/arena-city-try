# Game Loop

## Purpose

Owns everything that has exactly one instance: the `WebGLRenderer`, `Scene`, `PerspectiveCamera`, post-processing composer, the `requestAnimationFrame` loop, per-frame system scheduling order, delta-time clamping, resize, pause, autosave, and debug exposure on `window.game`. Boot entry is `src/main.ts`; orchestration lives in `src/game/Game.ts`; static world construction (ground/terrain/lights/sky) lives in `src/game/World.ts`. Player foot/driving behavior is deliberately NOT here — it was extracted into `ModeController` ("A-1 refactor", src/game/Game.ts:45-50).

## Execution Flow

### Bootstrap — main.ts

1. Import CSS bundle (`./ui/style.css`) first so styles exist before any DOM is built — src/main.ts:1.
2. Analytics tracker + global error handling installed **before** game construction so boot failures are caught — src/main.ts:10-14; error overlay only in DEV builds via `import.meta.env.DEV` — src/main.ts:13.
3. Grab `#app` container and the `#loading` overlay element; `hideLoading()` fades opacity to 0 then removes after 700 ms, guarded by a one-shot `loaded` flag — src/main.ts:16-26.
4. `new Game({ container })` inside try/catch; a thrown constructor error renders a fixed full-screen "game failed to start" div with a Reload button, tracks `boot_failed`, and rethrows — src/main.ts:29-45.
5. Register two frame callbacks via `game.onUpdate`: (a) hide loading + telemetry frame/update, (b) `hud.update(delta, game)` — src/main.ts:47-55. Both run inside the loop's callback flush (see step 32 below).
6. Wire HUD event hooks: `onPlayerDamaged`, `onWeaponHit`, `onPickup`, `onDialogue`, `onObjective` — src/main.ts:58-65; assign `game.telemetry = telemetry` and call `telemetry.sessionStart()` — src/main.ts:68-69.
7. Flush analytics on `pagehide` — src/main.ts:72.
8. **`game.start()`** — without this the loop never runs and the page sticks on the loading screen (comment at src/main.ts:74 says this line was previously missing) — src/main.ts:75.
9. Expose `(window as ...).game = game` and `.tracker = tracker` for console debugging — src/main.ts:78-79.

### Bootstrap — Game constructor order (src/game/Game.ts:120-338)

Creation order matters because later systems take earlier ones as arguments:

1. **Renderer**: `new WebGLRenderer({ antialias: true })`, pixel ratio `min(devicePixelRatio, 2)`, sized to container, shadow map enabled with `PCFSoftShadowMap`, `ACESFilmicToneMapping`, exposure 1.1, canvas appended to container — src/game/Game.ts:122-129.
2. **Camera**: `PerspectiveCamera(60, aspect, 0.1, 2000)`, initial position `(28, 22, 38)`, `lookAt(0, 2, 0)`; aspect denominator guarded with `Math.max(container.clientHeight, 1)` — src/game/Game.ts:132-135.
3. **Input**: `InputManager.attach(container)` — src/game/Game.ts:138-139.
4. **World**: constructed next; its `fog`, `skyColor`, and `root` group are grafted onto the scene — src/game/Game.ts:142-145.
5. Audio + PostFX + AutoQuality — src/game/Game.ts:148-150. PostFX builds the EffectComposer chain immediately in its own constructor (RenderPass → GTAO → UnrealBloom → LUT → OutputPass, sized from the renderer right away to avoid the old 1×1-pass bug) — src/systems/PostFX.ts:40-63.
6. Moon light `DirectionalLight(0x8fa8ff, 0.3)` at `(-80, 60, -40)`; the ambient light is looked back up out of `world.root.children` by identity check — src/game/Game.ts:153-156; `DayNightSystem(world.sun, ambient, world.hemi, moon, skyColor, fog, sky)` — src/game/Game.ts:157-165.
7. `WeatherSystem(scene, fog)` — src/game/Game.ts:166; `Vegetation` root added — src/game/Game.ts:167-168; `WetSurfaceSystem(world.groundMaterial, () => weather.rainAmount)` meshes added — src/game/Game.ts:171-172; `ColliderDebug` (off, F3-toggled) — src/game/Game.ts:175-176; `ParticleSystem(scene)` — src/game/Game.ts:177; `MobileControls(input)` — src/game/Game.ts:178.
8. **Player**: constructed, then positioned at `(SPAWN_X, 0.95, SPAWN_Z)` where `SPAWN_X = SPAWN_Z = 0` — src/game/Game.ts:181-183, src/systems/ModeController.ts:20-21; an immediate `world.update(player.x, player.z)` primes chunk streaming around spawn — src/game/Game.ts:184. `WeaponView.holder` is parented into `player.group` — src/game/Game.ts:186-187.
9. Parked vehicles: `VehicleManager` groups added to scene — src/game/Game.ts:190-191.
10. `EnemySystem` group — src/game/Game.ts:194-195; `PedestrianSystem` group — src/game/Game.ts:198-199; `TrafficSystem` car groups — src/game/Game.ts:201-202; `WantedSystem(enemies)` — src/game/Game.ts:204.
11. `MissionSystem(enemies, () => player.position, () => traffic cars)` plus marker group and three hooks (start → pickup toast + telemetry; complete → jingle/toast/save; objective → HUD text) — src/game/Game.ts:207-223.
12. `MinimapSystem` — src/game/Game.ts:225; `SaveManager` + `PauseMenu` with resume/restart/mute/stats callbacks — src/game/Game.ts:228-235.
13. `WeaponSystem` wired with a collidable provider `() => world.getCollidables().concat(vehicles.getCollidables())` evaluated fresh per raycast, and callbacks: `onHit` (HUD + sound), `onShoot` (sound, viewmodel kick, panic peds within 40 m, wanted +1 if a cop is within 55 m), `onKill` (kills++, kill sound, telemetry, wanted +2 for civilians), `onReload`, `onEmpty` — src/game/Game.ts:238-275.
14. `PickupSystem` with weapon/ammo hooks; `enemies.onEnemyDeath` spawns an ammo drop (+wanted 3 for cops); `spawnInitialPickups()` places SMG (-14,14), shotgun (14,-14), rifle (45,-30), two ammo boxes — src/game/Game.ts:278-303, src/game/Game.ts:611-617.
15. `loadSave()` restores profile/player pos/health/kills/weapons from localStorage before first frame — src/game/Game.ts:302, src/game/Game.ts:582-590; restored position is forced back to y=0.95 — src/game/Game.ts:586.
16. `CameraRig(camera)` — src/game/Game.ts:305; `ModeController` receives all deps last since it touches nearly every subsystem — src/game/Game.ts:308-323.
17. `window.addEventListener('resize', this.resize)` — src/game/Game.ts:326. One-shot WebAudio unlock on first `pointerdown`/`keydown` — src/game/Game.ts:329-335. `clock.start()` — src/game/Game.ts:337.

### The loop

Plain `requestAnimationFrame`, not `setAnimationLoop` — src/game/Game.ts:372-383:

1. If not running, bail — src/game/Game.ts:373.
2. Re-queue **first**: `this.animationId = requestAnimationFrame(this.loop)` — src/game/Game.ts:374.
3. `const delta = Math.min(this.clock.getDelta(), 0.05)` — THREE.Clock wall-clock delta clamped to 50 ms so tab-back hitches can't teleport entities — src/game/Game.ts:376.
4. `Escape` toggles `setPaused` — src/game/Game.ts:378; when paused, `update()` is skipped entirely (rendering too — nothing draws while paused) — src/game/Game.ts:380.
5. `input.endFrame()` runs **even when paused**, clearing edge-triggered key presses and mouse deltas — src/game/Game.ts:382, src/utils/InputManager.ts:169-174.

`start()`/`stop()` guard re-entry via the `running` flag and cancel the pending frame — src/game/Game.ts:344-353.

### Per-frame update order (src/game/Game.ts:385-467)

Exact sequence inside `Game.update(delta)`:

| # | Step | Ref |
|---|------|-----|
| 1 | Spatial audio listener follows camera | src/game/Game.ts:387 |
| 2 | Chunk streaming around `modeCtrl.activePosition` | src/game/Game.ts:389-390 |
| 3 | `dayNight.update(delta)` — must run before updateSun (comment: it computes shared sun direction/colors) | src/game/Game.ts:393 |
| 4 | `world.updateSun(x, z, dayNight.sunDirection)` — shadow frustum follows player | src/game/Game.ts:394 |
| 5 | `vehicles.update` — parked-car distance culling | src/game/Game.ts:395 |
| 6 | Build collidable lists: buildings ∪ parked vehicles | src/game/Game.ts:397-398 |
| 7 | F3 toggles collider wireframe; colliderDebug.update | src/game/Game.ts:401-402 |
| 8 | Enemy AI (LOS uses spatial `chunks.queryCircle(player, 70)`, not the full building list) | src/game/Game.ts:405-406 |
| 9 | Pedestrians | src/game/Game.ts:407 |
| 10 | Traffic AI | src/game/Game.ts:408 |
| 11 | Car-vs-pedestrian run-over check | src/game/Game.ts:409 |
| 12 | Traffic-vs-on-foot-player hit check | src/game/Game.ts:410 |
| 13 | Pickups | src/game/Game.ts:411 |
| 14 | Weapons | src/game/Game.ts:412 |
| 15 | **`modeCtrl.update`** — player movement, camera rig, enter/exit, driving physics, death timer | src/game/Game.ts:415 |
| 16 | Wanted level — **foot mode only** | src/game/Game.ts:416 |
| 17 | Civilian dialogue (`maybeSpeak`) — foot mode and health > 0 only | src/game/Game.ts:419-422 |
| 18 | Missions | src/game/Game.ts:425 |
| 19 | Minimap redraw | src/game/Game.ts:426, src/game/Game.ts:527-534 |
| 20 | Autosave every 30 s of accumulated sim time (`saveTimer`) | src/game/Game.ts:429-433 |
| 21 | Wanted-star change telemetry (edge-triggered via `lastWantedStars`) | src/game/Game.ts:436-439 |
| 22 | Weapon viewmodel bob/kick (moving = speed > 0.5 m/s; intensity `min(1, hypot(vx,vz)/9.5)`) | src/game/Game.ts:442-443 |
| 23 | Weather (rain follows camera) | src/game/Game.ts:446 |
| 24 | Vegetation sway driven by `clock.elapsedTime` (not delta — pure function of time) | src/game/Game.ts:447 |
| 25 | Wet-surface rain response | src/game/Game.ts:448 |
| 26 | Particles | src/game/Game.ts:449 |
| 27 | Explosion/smoke pass over newly wrecked vehicles | src/game/Game.ts:450, src/game/Game.ts:470-481 |
| 28 | Engine audio loop + KeyM mute toggle | src/game/Game.ts:451, src/game/Game.ts:483-491 |
| 29 | Exposure knob: `postfx.setExposure(0.55 + dayNight.day * 0.6)` (range 0.55 night → 1.15 noon) | src/game/Game.ts:453 |
| 30 | postfx.update (shake decay λ=2.2/s) | src/game/Game.ts:454, src/systems/PostFX.ts:75-86 |
| 31 | AutoQuality sample + tier adjust (samples FPS over 2 s windows; down <28 fps, up >50 fps after 2 good samples) | src/game/Game.ts:455-456, src/systems/AutoQuality.ts:4-6,32-54 |
| 32 | `updateCallbacks.forEach` — main.ts telemetry + **HUD** run here, after all simulation | src/game/Game.ts:458 |
| 33 | `applyShake(camera)` → render → `restoreShake(camera)` (shake never accumulates into camera state) | src/game/Game.ts:460-466 |

Rendering picks `composer.render()` when post-processing enabled, else raw `renderer.render` — src/game/Game.ts:461-465.

Notable ordering consequences: enemies/pedestrians/traffic/weapons all see the *previous* frame's player position (player updates at step 15); the HUD always sees fully-updated state because it runs at step 32.

### Resize handling

`resize` reads size off `renderer.domElement.parentElement` (not `window.innerWidth`), guards height ≥ 1, updates `camera.aspect` + `updateProjectionMatrix`, `renderer.setSize`, and `postfx.setSize` (which resizes composer, bloom, and GTAO passes) — src/game/Game.ts:619-628, src/systems/PostFX.ts:65-69. AutoQuality's tier changes also force a `renderer.setSize(window.innerWidth, window.innerHeight, false)` to apply new pixel ratio on the next frame — src/systems/AutoQuality.ts:56-63.

## Data Structures

- `Game` holds ~25 readonly subsystem fields declared src/game/Game.ts:52-82; mutable state is just `kills`, `paused`, private `saveTimer=30`, `exploded: Set<Vehicle>` (one-shot explosion dedupe), `lastWantedStars`, `lastTrafficHit` timestamp — src/game/Game.ts:84-88, src/game/Game.ts:542.
- Delegating getters keep the old public surface alive after the ModeController extraction: `mode` (`'foot' | 'driving'`), `vehicle`, `nearestVehicle`, `respawnTimer` — src/game/Game.ts:104-118.
- `updateCallbacks: Set<(delta:number)=>void>` fed by `onUpdate` — src/game/Game.ts:98, src/game/Game.ts:340-342.
- `World` exposes: `root: Group`, `skyColor: Color(0x87ceeb)`, `fog: Fog(0xbfd4e4, 90, 420)`, `chunks: ChunkManager`, lights `sun/hemi/rim`, `sky: SkySystem`, and the shared `groundMaterial` — src/game/World.ts:38-48. Private tuning: `shadowHalf = 55` (shadow ortho half-extent), `shadowDistance = 140` (light standoff) — src/game/World.ts:51-52.
- `Collidable` is just `{ box: Box3 }` — the single collision currency shared by player, vehicles, weapons, camera, and pedestrians — src/game/World.ts:22-24.
- City metrics World depends on: `BLOCK_SIZE=30`, `ROAD_WIDTH=10`, `CELL=40`, `BLOCK_COUNT=8`, `CITY_SIZE=310`, `CITY_HALF=155`, chunks are 16×16 m — src/systems/CityGenerator.ts:4-10, src/game/World.ts:27.

## Public API

- `Game` class: `clock`, `scene`, `camera`, `renderer` (all readonly), every subsystem field, `mode`/`vehicle`/`nearestVehicle`/`respawnTimer` getters, `onUpdate(cb)`, `start()`, `stop()`, `destroy()`, `save()`, `setPaused(bool)`, `restart()`, plus hook slots `telemetry`, `onPlayerDamaged`, `onWeaponHit`, `onPickup`, `onDialogue`, `onObjective` — src/game/Game.ts:51-100, src/game/Game.ts:340-370, src/game/Game.ts:572-604.
- `destroy()`: saves, stops loop, detaches input + resize listener, disposes world/vegetation/wet/colliderDebug/vehicles/traffic/wanted/particles/mobile/renderer — src/game/Game.ts:355-370.
- `World`: `updateSun(playerX, playerZ, sunDir)` (texel-snapped shadow frustum: center snapped to `worldTexelSize(55, 2048)` grid, sun placed `sunDir * 140` away, `normalBias = texel * 1.25`) — src/game/World.ts:101-118; `update(x,z): boolean` (true when chunks changed) — src/game/World.ts:121-123; `getCollidables()` delegates to `chunks.getActiveCollidables()` — src/game/World.ts:125-127; `dispose()` — src/game/World.ts:129-133; module-level export `terrainSurfaceY(x,z)` used by Vegetation to sit grass on the outer terrain — src/game/World.ts:248-252.

## Interactions

- **main.ts ↔ Game**: bootstraps, feeds two frame callbacks, wires HUD/analytics hooks, starts loop, sets `window.game` — src/main.ts:29-79.
- **Game ↔ ModeController**: Game supplies 13 deps incl. lazy telemetry getter and `onPlayerDamaged` relay — src/game/Game.ts:308-323; per frame Game asks it for `activePosition`/`activeYaw` (car while driving, else player) to drive world streaming, minimap, and audio listener — src/systems/ModeController.ts:62-70.
- **Game ↔ World**: scene grafts fog/background/root (src/game/Game.ts:143-145); DayNightSystem mutates World-owned lights/fog/sky each frame (src/game/Game.ts:157-165); WetSurfaceSystem shares `world.groundMaterial` (src/game/Game.ts:171).
- **Game ↔ VehicleManager/TrafficSystem**: culling around active position (src/game/Game.ts:395, src/systems/VehicleManager.ts:44-50); collision lists concatenated for weapons/traffic/pedestrians (src/game/Game.ts:397-398); `getCollidables(exclude?)` lets a hijacked car skip itself (src/systems/VehicleManager.ts:69-75).
- **Game ↔ WeaponSystem**: dynamic collidable provider closure (src/game/Game.ts:243); shooting near cops raises wanted stars (src/game/Game.ts:255-263).
- **Game ↔ EnemySystem**: enemy death → ammo drop + cop-kill crime report (src/game/Game.ts:297-300).
- **Run-over / traffic-hit rules**: cars ≥ 2.5 m/s hitting pedestrians kill or knock down by impact speed, slow the car ×0.72, shake screen, report crime 1–2, 400 ms cooldown per ped (src/game/Game.ts:497-525); fast traffic hitting the on-foot player deals `min(40, round((speed−2.5)·6))` damage and flings them along the car heading with vy=3.5, 400 ms cooldown (src/game/Game.ts:543-569).
- **PauseMenu → Game**: resume/mute call straight back into `setPaused`/`audio.setMuted`; restart wipes save + reloads page — src/game/Game.ts:229-235, src/game/Game.ts:600-604.
- **HUD** reads `game.player.health/maxHealth`, `game.vehicle.health`, mode, etc. each frame — src/ui/hud.ts:91-131.

## Tuning & Extension Points

- Delta clamp **0.05 s** (max 20 Hz sim under lag) — src/game/Game.ts:376.
- Renderer: antialias on, DPR cap **2**, PCFSoft shadows, ACES exposure base **1.1** — src/game/Game.ts:122-128.
- Camera: FOV **60**, near **0.1**, far **2000**, intro pose `(28,22,38)`→`(0,2,0)` — src/game/Game.ts:133-135.
- Autosave interval **30 s** — src/game/Game.ts:86, src/game/Game.ts:430-431.
- Exposure curve `0.55 + day*0.6` — src/game/Game.ts:453.
- Enemy LOS query radius **70 m** — src/game/Game.ts:405.
- Traffic-hit: min impact **2.5 m/s**, dmg scale **6/m/s**, cap **40**, knockback vy **3.5**, cooldown **400 ms** — src/game/Game.ts:553-566. Ped run-over: same 2.5 threshold, hit radius `max(width,length)*0.6+0.35`, car slows **×0.72** — src/game/Game.ts:506-512.
- Explosion feedback: particles + positional boom + shake **0.9** once per wreck; smoke every wrecked frame afterwards — src/game/Game.ts:470-481.
- Initial pickups coordinates — src/game/Game.ts:612-616.
- To add a system: construct it in the constructor in dependency order, add one `this.sys.update(delta, …)` line in `Game.update` at the correct slot (simulation systems before line src/game/Game.ts:415 if they should see last-frame player state, after if they need current-frame), dispose it in `destroy()`.
- World lighting tiers: sun intensity **2.4** w/ 2048² shadowmap, ortho ±55, near 10/far 260, bias −0.0005 — src/game/World.ts:61-70; hemi **0.5** — src/game/World.ts:75; rim **0.4** — src/game/World.ts:79-81; ambient **0.4** — src/game/World.ts:84.
- Ground plane is `CITY_SIZE+40` (=350 m) square at y=0 with a baked 2048² canvas: asphalt strips at each block boundary `(b+1)*CELL ± ROAD_WIDTH/2`, 1.5 m sidewalks, yellow dashed center lines (dash 4 m / gap 6 m), 4000 noise specks; texture sRGB, anisotropy 8, material roughness 0.92 — src/game/World.ts:139-203. Roads exist purely as texture — there are no road meshes or curbs.
- Outer terrain: 1600×1600 m, 96×96 segments, layered-sine hills (amplitudes 3.2/1.4/2.1/0.6 m — src/game/World.ts:255-262) eased flat inside radius 250 m and ramping over the next 130 m; mesh sits at y=−0.2 — src/game/World.ts:211-240.

## Unresolved

- Observed walk speed "~6.5 m/s" does not match the code: steady-state horizontal velocity converges exactly to `WALK_SPEED = 5.5` (exponential approach `k = 1-e^(-10·dt)` can only undershoot the target) — src/entities/Player.ts:16,161-166. No code path adds forward displacement beyond velocity integration except AABB push-out. Treat 6.5 as a stale/measurement-error figure unless a replay proves otherwise.
- The landmark tower sits at (20,20), not the origin, specifically so spawn/central roads stay clear (BUG-001/002 history) — src/systems/CityGenerator.ts:19-27. Any "props at spawn" assumptions must respect this.
- Nothing disposes `PostFX.composer` from `Game.destroy()` (`PostFX.dispose()` exists but is never called by Game) — src/game/Game.ts:355-370 vs src/systems/PostFX.ts:119-122. Harmless today (page teardown), but leaks GPU targets if Game is ever recreated in-page.
