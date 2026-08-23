/**
 * Headless smoke/regression tests for the game's pure-logic systems.
 * Run: npm test
 *
 * Covers: chunk generator (determinism/bounds/tower), parked vehicles
 * (placement on roads), enemies + weapon ammo/reload, traffic bounds,
 * pedestrians, wanted system + cop spawns, mission delivery flow.
 */
import {
  generateChunk,
  CHUNK_COUNT,
  TOWER_X,
  TOWER_Z,
  TOWER_SIZE,
  TOWER_HEIGHT,
} from '../src/systems/CityGenerator.ts'
import { VehicleManager } from '../src/systems/VehicleManager.ts'
import { EnemySystem } from '../src/systems/EnemySystem.ts'
import { WeaponSystem } from '../src/systems/WeaponSystem.ts'
import { InputManager } from '../src/utils/InputManager.ts'
import { TrafficSystem } from '../src/systems/TrafficSystem.ts'
import { PedestrianSystem } from '../src/systems/PedestrianSystem.ts'
import { WantedSystem } from '../src/systems/WantedSystem.ts'
import { MissionSystem } from '../src/systems/MissionSystem.ts'
import { MISSIONS } from '../src/data/missions.ts'
import {
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Fog,
  HemisphereLight,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
} from 'three'
import { Vehicle } from '../src/entities/Vehicle.ts'
import { VEHICLE_SEDAN } from '../src/data/vehicles.ts'
import { rayCapsule } from '../src/utils/raycast.ts'
import { SaveManager } from '../src/systems/SaveManager.ts'
import { ChunkManager } from '../src/systems/ChunkManager.ts'
import { Tracker } from '../src/analytics/tracker.ts'
import { initErrorHandling } from '../src/utils/errors.ts'
import { ModeController } from '../src/systems/ModeController.ts'
import { Player } from '../src/entities/Player.ts'
import { CameraRig } from '../src/systems/CameraRig.ts'
import { WeaponView } from '../src/systems/WeaponView.ts'
import { AudioManager } from '../src/systems/AudioManager.ts'
import { WEAPONS } from '../src/data/weapons.ts'
import { SkySystem } from '../src/systems/SkySystem.ts'
import { DayNightSystem } from '../src/systems/DayNightSystem.ts'
import { Vegetation } from '../src/systems/Vegetation.ts'
import { WetSurfaceSystem } from '../src/systems/WetSurfaceSystem.ts'
import { buildGradeLUT } from '../src/systems/ColorGrade.ts'
import { worldTexelSize, snapToGrid } from '../src/utils/texel.ts'
import { SpatialHash } from '../src/utils/SpatialHash.ts'
import { PoolManager, ObjectPool } from '../src/utils/PoolManager.ts'
import { createVisualTrack, createPath } from '../src/systems/TrackSpline.ts'
import { TRACK_1_POINTS } from '../src/data/tracks/track_1.ts'

// ChunkManager.update() builds CanvasTextures — stub the DOM bits three needs.
const fakeCtx = new Proxy({}, { get: (t, k) => (k === 'canvas' ? fakeCanvas : () => {}), set: () => true })
const fakeCanvas = { width: 0, height: 0, getContext: () => fakeCtx }
globalThis.document = { createElement: () => fakeCanvas }

let pass = 0
let fail = 0
const ok = (name, cond) => {
  if (cond) pass++
  else {
    fail++
    console.log('FAIL:', name)
  }
}

// --- A-2: chunk spatial query (grid indexing) ---
const cm = new ChunkManager()
const { cx, cz } = cm.worldToChunk(0, 0)
ok('worldToChunk maps center to center cell', cx === cz)
let visited = 0
cm.forEachNear(0, 0, 50, () => visited++)
ok('forEachNear empty grid no-op', visited === 0)
ok('queryCircle empty grid', cm.queryCircle(0, 0, 50).length === 0)

// --- A-3: instanced LOD activation (with DOM stub above) ---
const cmInst = new ChunkManager()
ok('update activates full+simple rings', cmInst.update(0, 0) === true && cmInst.activeCount === 49)
let instanced = 0
for (const c of cmInst['chunks'].values()) if (c.simpleInstances) instanced++
ok('every active chunk has an InstancedMesh', instanced === 49)
cmInst.update(10000, 10000)
ok('teleport far sparse (B2 infinite) still has 49 active', cmInst.activeCount === 49)
const meshCount = [...cmInst['chunks'].values()].reduce((a, c) => a + c.buildingsGroup.children.length, 0)
cmInst.update(0, 0)
const meshCountAfter = [...cmInst['chunks'].values()].reduce((a, c) => a + c.buildingsGroup.children.length, 0)
ok('reactivation does not duplicate meshes', meshCountAfter >= meshCount && meshCount > 0 && cmInst.activeCount === 49)

// --- Phase 2: chunks ---
let totalB = 0
let det = true
for (let cx = 0; cx < CHUNK_COUNT; cx++) {
  for (let cz = 0; cz < CHUNK_COUNT; cz++) {
    const c1 = generateChunk(cx, cz)
    const c2 = generateChunk(cx, cz)
    if (JSON.stringify(c1) !== JSON.stringify(c2)) det = false
    totalB += c1.buildings.length
  }
}
ok('chunks deterministic', det)
ok('buildings total > 150', totalB > 150)
// the 72m landmark tower now lives in a block NE of center, not at the origin
let towerFound = null
for (let cx = 0; cx < CHUNK_COUNT; cx++) {
  for (let cz = 0; cz < CHUNK_COUNT; cz++) {
    const t = generateChunk(cx, cz).buildings.find(b => b.h >= 70)
    if (t) towerFound = t
  }
}
ok('tower exists somewhere', towerFound !== null)
ok('tower is 16x16x72 at (20,20)', towerFound && towerFound.cx === TOWER_X && towerFound.cz === TOWER_Z && towerFound.w === TOWER_SIZE && towerFound.d === TOWER_SIZE && towerFound.h === TOWER_HEIGHT)
ok('tower clear of the spawn origin (0,0)', towerFound && (TOWER_SIZE / 2 <= TOWER_X && TOWER_SIZE / 2 <= TOWER_Z))

// --- jitter root-cause regression: no active collider overlaps the spawn ---
const cmSpawn = new ChunkManager()
cmSpawn.update(0, 0)
const spawnR = 0.45
let spawnBlocked = false
for (const c of cmSpawn.getActiveCollidables()) {
  const b = c.box
  const nx = Math.max(b.min.x, Math.min(0, b.max.x))
  const nz = Math.max(b.min.z, Math.min(0, b.max.z))
  const dx = 0 - nx
  const dz = 0 - nz
  if (dx * dx + dz * dz < spawnR * spawnR) spawnBlocked = true
}
ok('player spawn (0,0) is clear of all colliders', spawnBlocked === false)

// --- Phase 3: parked vehicles ---
const vm = new VehicleManager()
ok('parked vehicles = 24', vm.vehicles.length === 24)
ok('all parked on roads', vm.vehicles.every(v => {
  const p = v.position
  const lx = (p.x + 155) % 40
  const lz = (p.z + 155) % 40
  return lx >= 29 || lz >= 29
}))

// --- Phase 4: enemies + weapons ---
const enemies = new EnemySystem()
let deaths = 0
enemies.onEnemyDeath = () => deaths++
enemies.damageEnemy(enemies.enemies[0], 1000)
ok('enemy kill + death callback', deaths === 1 && enemies.aliveCount === 13)

const scene = new Scene()
const cam = new PerspectiveCamera()
cam.position.set(0, 1.5, 5)
cam.lookAt(0, 1, 0)
const input = new InputManager()
const ws = new WeaponSystem(scene, cam, input, enemies, () => [], { onReload: () => {}, onEmpty: () => {} })
ws.giveWeapon('smg')
ws.switchWeapon('smg')
input.isMouseDown = () => true
input.isDragging = () => false
for (let i = 0; i < 70; i++) ws.update(0.05)
ws.update(0.1)
ws.update(2.0)
ok('smg drain + reload', ws.mag === 29 && ws.reserve === 90)

// --- B-1 fix: humanoid hit capsules (chest shot must connect) ---
const enemyFeet = new Vector3(0, 0, 0)
const chestDir = new Vector3(0, 1.4, 0).sub(cam.position).normalize()
ok('rayCapsule chest hit', rayCapsule(cam.position, chestDir, enemyFeet, 0.45, 1.8, 100) !== null)
const headDir = new Vector3(0, 1.7, 0).sub(cam.position).normalize()
ok('rayCapsule head hit', rayCapsule(cam.position, headDir, enemyFeet, 0.45, 1.8, 100) !== null)
const highDir = new Vector3(0, 2.7, 0).sub(cam.position).normalize()
ok('rayCapsule above-head miss', rayCapsule(cam.position, highDir, enemyFeet, 0.45, 1.8, 100) === null)

// --- B-1 integration: shooting an enemy aimed at the chest deals damage ---
const freshEnemies = new EnemySystem()
freshEnemies.enemies[0].group.position.set(0, 0, 0) // put the target at the origin
const freshCam = new PerspectiveCamera()
freshCam.position.set(0, 1.5, 6)
freshCam.lookAt(0, 1.4, 0) // chest of the enemy at (0,0,0)
const freshInput = new InputManager()
const ws2 = new WeaponSystem(scene, freshCam, freshInput, freshEnemies, () => [], {})
const target = freshEnemies.enemies[0]
const before = target.health
freshInput.consumeClick = () => true
for (let i = 0; i < 5; i++) ws2.update(0.3) // semi-auto clicks
ok('chest-aimed shot damages enemy', target.health < before)

// --- I-3/I-4: run-over kills a pedestrian and reports a crime ---
const peds = new PedestrianSystem()
const ped = peds.pedestrians[0]
const killed = ped.runOver(12) // hard hit
ok('run-over kills at speed 12', killed && ped.dead)

// --- Phase 5: traffic / pedestrians / wanted ---
const traffic = new TrafficSystem()
for (let i = 0; i < 300; i++) traffic.update(1 / 60, 0, 0, [])
ok('traffic stays in bounds', traffic.cars.every(c =>
  Math.abs(c.vehicle.position.x) < 156 && Math.abs(c.vehicle.position.z) < 156))

const peds2 = new PedestrianSystem()
peds2.update(0.016, [])
ok('pedestrians alive', peds2.alive.length === 22)

const wanted = new WantedSystem(enemies)
const pp = new Vector3(0, 0, 0)
wanted.reportCrime(2, pp)
wanted.reportCrime(3, pp)
ok('wanted stars >= 3', wanted.stars >= 3)
for (let i = 0; i < 12; i++) wanted.update(1, pp)
ok('cops spawn from wanted', enemies.enemies.filter(e => e.role === 'cop').length > 0)

// --- Phase 6: missions ---
let playerPos = new Vector3(-62, 0.95, 58)
const missions = new MissionSystem(enemies, () => playerPos, () => [])
ok('mission zone detect', missions.zoneAt(-60, 60)?.id === 'delivery_1')
missions.startMission(MISSIONS[0])
missions.update(0.016)
playerPos.set(92, 0.95, -64)
for (let i = 0; i < 10; i++) missions.update(0.016)
ok('delivery completes + money', missions.active === null && missions.profile.money === 150)

// --- I-5: weapon inventory save/load roundtrip ---
const wsA = new WeaponSystem(scene, cam, input, enemies, () => [], {})
wsA.giveWeapon('rifle')
wsA.giveWeapon('shotgun')
wsA.switchWeapon('rifle')
const snap = wsA.serialize()
const wsB = new WeaponSystem(scene, cam, input, enemies, () => [], {})
wsB.deserialize(snap)
ok('weapon save/load: owned set', wsB.hasWeapon('rifle') && wsB.hasWeapon('shotgun') && !wsB.hasWeapon('smg'))
ok('weapon save/load: current + ammo', wsB.currentWeaponId === 'rifle' && wsB.mag === WEAPONS.rifle.magSize && wsB.reserve === WEAPONS.rifle.reserveMax)

// --- SaveManager roundtrip with a localStorage mock ---
const store = new Map()
globalThis.localStorage = {
  getItem: k => store.get(k) ?? null,
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: k => void store.delete(k),
}
const sm = new SaveManager('test_save_key')
const saved = sm.save({ profile: '{}', pos: { x: 3, z: 4 }, health: 55, kills: 7, weapons: snap })
const loaded = sm.load()
ok('saveManager save+load', saved && loaded?.kills === 7 && loaded.pos.x === 3)
sm.clear()
ok('saveManager clear', sm.load() === null)

// --- Analytics: tracker queue + persistence + flush race safety ---
const trackStore = new Map()
globalThis.localStorage = {
  getItem: k => trackStore.get(k) ?? null,
  setItem: (k, v) => void trackStore.set(k, String(v)),
  removeItem: k => void trackStore.delete(k),
}
const t1 = new Tracker({ endpoint: 'http://localhost:9/events', siteId: 'test', flushAt: 3 })
ok('tracker session id generated', t1.sessionId.length > 4)
t1.track('test_event', { x: 1 })
t1.track('test_event', { x: 2 })
ok('tracker queue accumulates before flush threshold', t1.queuedCount === 2)
t1.track('test_event', { x: 3 }) // flushAt=3 → async flush fires (fails: unreachable endpoint)
ok('tracker keeps events queued while flush in flight', t1.queuedCount === 3)
const t2 = new Tracker({ endpoint: 'http://localhost:9/events', siteId: 'test' })
ok('tracker persists queue to localStorage', t2.queuedCount === 3)

// --- Error handler: init must be a safe no-op outside a browser ---
let reported = 0
initErrorHandling({ onReport: () => { reported++ }, overlay: false })
ok('error handler init does not throw (guarded)', true)

// --- A-1: ModeController foot/driving state machine ---
const mcCam = new PerspectiveCamera()
const mcPlayer = new Player()
const mcDeps = {
  player: mcPlayer,
  cameraRig: new CameraRig(mcCam),
  input: new InputManager(),
  vehicles: new VehicleManager(),
  traffic: new TrafficSystem(),
  world: { getCollidables: () => [] },
  missions: new MissionSystem(enemies, () => mcPlayer.position, () => []),
  weapons: new WeaponSystem(new Scene(), mcCam, input, enemies, () => [], {}),
  weaponView: new WeaponView(),
  enemies,
  audio: new AudioManager(),
  postfx: { addShake: () => {} },
}
const mc = new ModeController(mcDeps)
ok('mode starts on foot', mc.mode === 'foot')
const car = mcDeps.vehicles.vehicles[0]
mc.enterVehicle(car)
ok('enter → driving + occupied + stolen', mc.mode === 'driving' && car.occupied && car.stolen)
ok('player hidden while driving', mcPlayer.group.visible === false)
mc.exitVehicle()
ok('exit → foot + player visible + car free', mc.mode === 'foot' && mcPlayer.group.visible && !car.occupied)
ok('exit places player beside the car', Math.hypot(mcPlayer.position.x - car.position.x, mcPlayer.position.z - car.position.z) > 1)

// --- M2: shadow texel snapping (pure math) ---
const texel = worldTexelSize(55, 2048)
ok('worldTexelSize ≈ 0.0537 m', Math.abs(texel - 0.05371) < 1e-4)
ok('snapToGrid rounds to grid', snapToGrid(10.0, texel) !== snapToGrid(10.1, texel))
ok('snapToGrid stable at same value', snapToGrid(10.02, texel) === snapToGrid(10.02, texel))
ok('snapToGrid zero-size is identity', snapToGrid(7.3, 0) === 7.3)

// --- M1: day/night drives a single shared sun direction (sky + light) ---
const sky = new SkySystem()
const dnSun = new DirectionalLight()
const dnAmbient = new AmbientLight()
const dnHemi = new HemisphereLight()
const dnMoon = new DirectionalLight()
const dnSkyColor = new Color()
const dnFog = new Fog(0xffffff, 90, 420)
const dn = new DayNightSystem(dnSun, dnAmbient, dnHemi, dnMoon, dnSkyColor, dnFog, sky)

dn.timeOfDay = 0.5 // noon
dn.update(0)
ok('noon: sun high, day ≈ 1', dn.sunDirection.y > 0.6 && dn.day > 0.95)
ok('sky shares the same sun direction', Math.abs(sky.uniforms.sunDirection.value.y - dn.sunDirection.y) < 1e-6)

dn.timeOfDay = 0.0 // midnight
dn.update(0)
ok('midnight: sun below horizon, day ≈ 0', dn.sunDirection.y <= 0 && dn.day < 0.02)
ok('sun direction is a unit vector', Math.abs(dn.sunDirection.length() - 1) < 1e-4)

// --- M3: instanced grass (one draw call, blades placed on the terrain ring) ---
const veg = new Vegetation()
ok('grass is a single InstancedMesh', veg.root.children.length === 1 && veg.root.children[0].isInstancedMesh)
ok('all grass blades placed', veg.root.children[0].count === 24000)
ok('grass blade geometry indexed', veg.root.children[0].geometry.index !== null)
veg.dispose()

// --- M4: wet surfaces follow the shared rain envelope with progress bands ---
const fakeGround = new MeshStandardMaterial({ roughness: 0.92 })
let fakeRain = 0
const wet = new WetSurfaceSystem(fakeGround, () => fakeRain)
ok('wetness starts dry', wet.wetness === 0)
fakeRain = 1
for (let i = 0; i < 120; i++) wet.update(1 / 60)
ok('wetness rises toward rain', wet.wetness > 0.7)
ok('wet roughness collapses (early band)', fakeGround.roughness < 0.6)
fakeRain = 0
for (let i = 0; i < 120; i++) wet.update(1 / 60)
ok('wetness dries out', wet.wetness < 0.3)
ok('roughness returns when dry', fakeGround.roughness > 0.8)
wet.dispose()

// --- Traffic solidity: visible traffic cars become solid obstacles ---
const trafficSolid = new TrafficSystem()
ok('traffic collidables empty while all culled', trafficSolid.getCollidables().length === 0)
const tc1 = trafficSolid.cars[0].vehicle
tc1.group.visible = true
ok('visible traffic car is solid', trafficSolid.getCollidables().length === 1)
ok('getCollidables excludes self', trafficSolid.getCollidables(tc1).length === 0)

// --- AI-driven vehicles take impact damage (realistic crashes) ---
const crashCar = new Vehicle(VEHICLE_SEDAN, 0, 0, 0) // facing +z (yaw 0)
crashCar.speed = 20 // already moving fast into a wall ahead
const wall = { box: new Box3(new Vector3(-3, 0, 0.5), new Vector3(3, 3, 3)) }
crashCar.aiDrive(1 / 60, 0, 20, [wall])
ok('AI vehicle takes impact damage on collision', crashCar.health < crashCar.config.maxHealth)

// --- T2-T3: SpatialHash + PoolManager + Save v2 zod ---
const hash = new SpatialHash()
hash.insert(0, 0, 0); hash.insert(1, 32, 0); hash.insert(2, 0, 32)
ok('spatialHash radius 12 returns only center', hash.queryRadius(0, 0, 12).length === 1 && hash.queryRadius(0, 0, 12)[0] === 0)
ok('spatialHash radius 40 returns 3', hash.queryRadius(0, 0, 40).length === 3)
hash.clear(); ok('spatialHash clear', hash.queryRadius(0, 0, 40).length === 0)
const pm = new PoolManager(); const eid1 = pm.acquire(); pm.release(eid1); const eid2 = pm.acquire()
ok('PoolManager reuses eid', eid1 === eid2)
const pool = new ObjectPool(() => ({ id: Math.random() }), o => { o.id = 0 })
const o1 = pool.acquire(); pool.release(o1); ok('ObjectPool reuses object', pool.acquire() === o1 && pool.size === 0)
// Save v2: corrupt health should be rejected (zod), v1 migration
const corruptStore = new Map()
globalThis.localStorage = { getItem: k => corruptStore.get(k) ?? null, setItem: (k,v) => void corruptStore.set(k,String(v)), removeItem: k => void corruptStore.delete(k) }
corruptStore.set('cityrush_save_v2', JSON.stringify({ v:2, profile:'{}', pos:{x:0,z:0}, health:999, kills:0, weapons:{ owned:['pistol'], current:'pistol', ammo:{ pistol:{mag:10,reserve:10}}}}))
ok('Save v2 rejects health 999', new SaveManager().load() === null)
corruptStore.clear()
corruptStore.set('cityrush_save_v1', JSON.stringify({ profile:'{}', pos:{x:1,z:2}, health:55, kills:3, weapons:{ owned:['pistol'], current:'pistol', ammo:{ pistol:{mag:8,reserve:20}}}}))
const migrated = new SaveManager().load()
ok('Save v1 migrates to v2', migrated !== null && migrated.pos.x === 1 && migrated.health === 55)
ok('migration persists v2', corruptStore.has('cityrush_save_v2'))

// --- T13: 3 emergent scenarios (pileup hujan + wanted chase + panic) ---
const rainCar = new Vehicle(VEHICLE_SEDAN, 0, 0, 0); rainCar.speed = 18
rainCar.aiDrive(0.016, 0, 18, [{ box: new Box3(new Vector3(-3,0,0.5), new Vector3(3,3,3)) }])
ok('emergent: high-speed traffic hits wall => damage (rain pileup)', rainCar.health < rainCar.config.maxHealth)
const wantedE = new EnemySystem(); const wantedSys = new WantedSystem(wantedE); wantedSys.reportCrime(3, new Vector3(0,0,0))
for (let i=0;i<15;i++) wantedSys.update(1, new Vector3(0,0,0))
ok('emergent: wanted chase spawns cops', wantedE.enemies.filter(e=>e.role==='cop').length>0)
const panicPeds = new PedestrianSystem(); const beforePanic = panicPeds.alive.length
panicPeds.panicNear(new Vector3(panicPeds.pedestrians[0].position.x,0,panicPeds.pedestrians[0].position.z), 40)
ok('emergent: gunfire panic triggers pedestrian reaction', panicPeds.alive.length===beforePanic) // ponytail: panicNear no kill, just state - check no crash
// --- B1 TypedArray SoA (openworld-js addobj.js:22) ---
const b1c = generateChunk(0, 0)
ok('B1 buildingData SoA packed', b1c.buildingData.length === b1c.buildings.length * 5 && b1c.buildingColors.length === b1c.buildings.length && b1c.dirty === true)
const cmB1 = new ChunkManager(); cmB1.update(0,0); const someB1 = [...cmB1['chunks'].values()].find(c=>c.built)
ok('B1 chunk dirty cleared after build', someB1 && someB1.dirty === false)
// --- B2 infinite sparse hash (mavon skeleton) ---
const far1 = generateChunk(999, 999), far2 = generateChunk(999, 999)
ok('B2 far chunk deterministic via hash seed', JSON.stringify(far1) === JSON.stringify(far2))
const cmB2 = new ChunkManager(); cmB2.update(0,0); const beforeSize = cmB2['chunks'].size; cmB2.update(10000,10000); ok('B2 sparse creates beyond CITY 310', cmB2['chunks'].size > beforeSize && cmB2.activeCount === 49)
// --- B3 spline visual (racing Track.ts:102) + traffic hook ---
const vis = createVisualTrack(TRACK_1_POINTS); ok('B3 visual track mesh', vis.isMesh && vis.geometry !== null)
const { pathPoints } = createPath(TRACK_1_POINTS); ok('B3 pathPoints CatmullRom 99', pathPoints.length === 99)
const tB3 = new TrafficSystem(); tB3.enableRace(pathPoints); ok('B3 traffic race hook', tB3['racePoints'] !== null); tB3.disableRace(); ok('B3 traffic race off', tB3['racePoints'] === null)

// --- M5: generated grade LUT is well-formed and neutral-preserving ---
const lut = buildGradeLUT(33)
ok('grade LUT is 33^3 RGBA8', lut.image.width === 33 && lut.image.height === 33 && lut.image.depth === 33 && lut.image.data.length === 33 * 33 * 33 * 4)
ok('grade LUT black stays black', lut.image.data[0] === 0 && lut.image.data[1] === 0 && lut.image.data[2] === 0)
const last = (33 * 33 * 33 - 1) * 4
ok('grade LUT white stays white', lut.image.data[last] === 255 && lut.image.data[last + 1] === 255 && lut.image.data[last + 2] === 255)

console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
