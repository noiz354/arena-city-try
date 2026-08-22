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

let pass = 0
let fail = 0
const ok = (name, cond) => {
  if (cond) pass++
  else {
    fail++
    console.log('FAIL:', name)
  }
}

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

// --- Phase 5: traffic / pedestrians / wanted ---
const traffic = new TrafficSystem()
for (let i = 0; i < 300; i++) traffic.update(1 / 60, 0, 0, [])
ok('traffic stays in bounds', traffic.cars.every(c =>
  Math.abs(c.vehicle.position.x) < 156 && Math.abs(c.vehicle.position.z) < 156))

const peds = new PedestrianSystem()
peds.update(0.016, [])
ok('pedestrians alive', peds.alive.length === 22)

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

console.log(`\nRESULT: ${pass} passed, ${fail} failed`)
process.exit(fail > 0 ? 1 : 0)
