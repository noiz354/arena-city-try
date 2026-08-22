/**
 * Headless smoke/regression tests for the game's pure-logic systems.
 * Run: npm test
 *
 * Covers: chunk generator (determinism/bounds/tower), parked vehicles
 * (placement on roads), enemies + weapon ammo/reload, traffic bounds,
 * pedestrians, wanted system + cop spawns, mission delivery flow.
 */
import { generateChunk, CHUNK_COUNT, CHUNK_CENTER } from '../src/systems/CityGenerator.ts'
import { VehicleManager } from '../src/systems/VehicleManager.ts'
import { EnemySystem } from '../src/systems/EnemySystem.ts'
import { WeaponSystem } from '../src/systems/WeaponSystem.ts'
import { InputManager } from '../src/utils/InputManager.ts'
import { TrafficSystem } from '../src/systems/TrafficSystem.ts'
import { PedestrianSystem } from '../src/systems/PedestrianSystem.ts'
import { WantedSystem } from '../src/systems/WantedSystem.ts'
import { MissionSystem } from '../src/systems/MissionSystem.ts'
import { MISSIONS } from '../src/data/missions.ts'
import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { rayCapsule } from '../src/utils/raycast.ts'
import { SaveManager } from '../src/systems/SaveManager.ts'
import { ChunkManager } from '../src/systems/ChunkManager.ts'
import { WEAPONS } from '../src/data/weapons.ts'

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
ok('center tower', generateChunk(CHUNK_CENTER, CHUNK_CENTER).buildings.some(b => b.h >= 70))

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

console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
