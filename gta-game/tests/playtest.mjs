/**
 * BOT PLAYTEST (headless) — plays the game's logic core like a real player:
 * walk → sprint → jump → shoot → enter car → drive → steer → exit → run a
 * mission — while asserting game invariants (no NaN positions, no crashes,
 * correct state transitions, HUD-visible stats progress).
 *
 * This exercises the REAL systems wired together (Player, VehicleManager,
 * ModeController, MissionSystem, EnemySystem, WeaponSystem, Traffic, Peds)
 * without a browser. Run: npm run test:play
 */
import { PerspectiveCamera, Scene, Vector3 } from 'three'
import { Player } from '../src/entities/Player.ts'
import { InputManager } from '../src/utils/InputManager.ts'
import { VehicleManager } from '../src/systems/VehicleManager.ts'
import { ModeController } from '../src/systems/ModeController.ts'
import { CameraRig } from '../src/systems/CameraRig.ts'
import { MissionSystem } from '../src/systems/MissionSystem.ts'
import { EnemySystem } from '../src/systems/EnemySystem.ts'
import { WeaponSystem } from '../src/systems/WeaponSystem.ts'
import { WeaponView } from '../src/systems/WeaponView.ts'
import { AudioManager } from '../src/systems/AudioManager.ts'
import { TrafficSystem } from '../src/systems/TrafficSystem.ts'
import { PedestrianSystem } from '../src/systems/PedestrianSystem.ts'
import { MISSIONS } from '../src/data/missions.ts'

let pass = 0
let fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ FAIL: ${name}${extra ? ' — ' + extra : ''}`) }
}
const finite = (v) => Number.isFinite(v)

console.log('=== BOT PLAYTEST — CITY RUSH (headless logic core) ===\n')

// --- world & systems (no DOM needed: three scene-graph only) ---
const scene = new Scene()
const cam = new PerspectiveCamera(60, 16 / 9, 0.1, 2000)
const input = new InputManager()
const player = new Player()
const vehicles = new VehicleManager()
const enemies = new EnemySystem()
const peds = new PedestrianSystem()
const traffic = new TrafficSystem()
const audio = new AudioManager()
const weaponView = new WeaponView()

const worldStub = { getCollidables: () => [] }

const missions = new MissionSystem(enemies, () => player.position, () => traffic.cars.map(c => c.vehicle))
const weapons = new WeaponSystem(scene, cam, input, enemies, () => vehicles.getCollidables(), {})
// combat test uses an open-field weapon system (no parked cars in the line of fire)
const weaponsOpen = new WeaponSystem(scene, cam, input, enemies, () => [], {})
const cameraRig = new CameraRig(cam)

const mc = new ModeController({
  player,
  cameraRig,
  input,
  vehicles,
  traffic,
  world: worldStub,
  missions,
  weapons,
  weaponView,
  enemies,
  audio,
  postfx: { addShake: () => {} },
  onPlayerDamaged: undefined,
})

const DT = 1 / 60
const startPos = player.position.clone()
const sim = (seconds, fn) => { for (let i = 0; i < seconds * 60; i++) { fn(i * DT); input.endFrame() } }

// ---------- 1. WALK ----------
console.log('--- 1. On-foot movement ---')
input.setVirtualKey('KeyW', true)
sim(2, () => {
  mc.update(DT, worldStub.getCollidables())
  cameraRig.update(DT, input, player.position, [])
})
input.setVirtualKey('KeyW', false)
const walkDist = player.position.distanceTo(startPos)
ok('walks forward (moved > 1m in 2s)', walkDist > 1, `${walkDist.toFixed(2)}m`)
ok('player position finite', finite(player.position.x) && finite(player.position.z))

// ---------- 2. SPRINT drains stamina ----------
console.log('--- 2. Sprint + stamina ---')
const stamBefore = player.stamina
input.setVirtualKey('KeyW', true)
input.setVirtualKey('ShiftLeft', true)
sim(1.5, () => {
  mc.update(DT, worldStub.getCollidables())
  cameraRig.update(DT, input, player.position, [])
})
input.setVirtualKey('KeyW', false)
input.setVirtualKey('ShiftLeft', false)
ok('sprinting drains stamina', player.stamina < stamBefore, `${stamBefore.toFixed(0)} → ${player.stamina.toFixed(0)}`)
ok('stamina never negative', player.stamina >= 0)

// ---------- 3. JUMP ----------
console.log('--- 3. Jump + gravity ---')
let wasAirborne = false
input.pressVirtualKey('Space')
sim(0.3, () => {
  mc.update(DT, worldStub.getCollidables())
  if (player.position.y > 1.1) wasAirborne = true
})
ok('jump leaves the ground', wasAirborne, `peak y=${player.position.y.toFixed(2)}`)
sim(1.2, () => mc.update(DT, worldStub.getCollidables()))
ok('lands back on ground', player.position.y <= 1.0, `y=${player.position.y.toFixed(2)}`)

// ---------- 4. SHOOT (aim at an enemy, chest height) ----------
console.log('--- 4. Combat ---')
const target = enemies.enemies[0]
target.group.position.set(0, 0, 0)
player.group.position.set(0, 0.95, 1)
cam.position.set(0, 1.5, 6)
cam.lookAt(0, 1.4, 0)
cam.updateMatrixWorld(true)
const hpBefore = target.health
// NOTE: do NOT call mc.update here — it repositions the camera via cameraRig.
// Aim the camera manually, then fire straight through an open-field weapon
// system (no parked cars between the camera and the target).
input.injectClick()
sim(0.4, () => { weaponsOpen.update(DT) })
ok('chest-aimed shot hits enemy', target.health < hpBefore, `hp ${hpBefore} → ${target.health}`)
ok('weapon mag decreased', weaponsOpen.mag < 12)

// ---------- 5. ENTER CAR + DRIVE ----------
console.log('--- 5. Driving ---')
const car = vehicles.vehicles[0]
player.group.position.set(car.position.x + 2, 0.95, car.position.z)
mc.update(DT, worldStub.getCollidables())
input.pressVirtualKey('KeyE')
mc.update(DT, worldStub.getCollidables())
ok('E near car → driving', mc.mode === 'driving', `mode=${mc.mode}`)
ok('car occupied + stolen', car.occupied && car.stolen)

const carStartPos = car.position.clone()
input.setVirtualKey('KeyW', true)
sim(3, () => {
  mc.update(DT, worldStub.getCollidables())
  cameraRig.update(DT, input, car.position, [])
})
ok('throttle moves the car', car.position.distanceTo(carStartPos) > 3, `${car.position.distanceTo(carStartPos).toFixed(1)}m`)
ok('car speed sane', car.speedKmh > 0 && car.speedKmh < 300, `${car.speedKmh.toFixed(0)} km/h`)
ok('car position finite', finite(car.position.x) && finite(car.position.z) && finite(car.position.y))

const yawBefore = car.yaw
input.setVirtualKey('KeyA', true)
sim(1.2, () => mc.update(DT, worldStub.getCollidables()))
input.setVirtualKey('KeyA', false)
ok('steering turns the car', Math.abs(car.yaw - yawBefore) > 0.05, `Δyaw=${(Math.abs(car.yaw - yawBefore)).toFixed(2)}`)
input.setVirtualKey('KeyW', false)

// ---------- 6. EXIT CAR ----------
console.log('--- 6. Exit ---')
input.pressVirtualKey('KeyE')
mc.update(DT, worldStub.getCollidables())
ok('E while driving → foot', mc.mode === 'foot')
ok('car freed', !car.occupied)
ok('player placed beside car', player.position.distanceTo(car.position) > 1.5, `${player.position.distanceTo(car.position).toFixed(1)}m`)

// ---------- 7. MISSION (delivery end-to-end) ----------
console.log('--- 7. Mission: delivery ---')
const delivery = MISSIONS[0]
player.group.position.set(-60, 0.95, 60)
mc.update(DT, worldStub.getCollidables())
input.pressVirtualKey('KeyE')
mc.update(DT, worldStub.getCollidables())
ok('E in mission zone starts mission', missions.active?.def.id === 'delivery_1', missions.active ? missions.active.def.id : 'none')
const money0 = missions.profile.money
// walk to pickup (it's near the start) — mission progress advances via missions.update
player.group.position.set(-62, 0.95, 58)
sim(1, () => { mc.update(DT, worldStub.getCollidables()); missions.update(DT) })
ok('pickup advances objective', missions.active?.objective === 1, `objective=${missions.active?.objective}`)
// teleport to dropoff
player.group.position.set(92, 0.95, -64)
sim(1, () => { mc.update(DT, worldStub.getCollidables()); missions.update(DT) })
ok('dropoff completes mission + reward', missions.active === null && missions.profile.money > money0,
  `money ${money0} → ${missions.profile.money}`)

// ---------- 8. FAIL / RETRY (death → respawn restores play) ----------
console.log('--- 8. Fail/retry path ---')
player.takeDamage(100) // lethal hit → death
player.group.position.set(50, 0.95, 50)
sim(0.1, () => mc.update(DT, worldStub.getCollidables()))
ok('lethal hit triggers respawn timer', mc.respawnTimer > 0, `timer=${mc.respawnTimer.toFixed(1)}`)
sim(3.2, () => mc.update(DT, worldStub.getCollidables()))
ok('respawn restores health + position + playable state',
  player.health === player.maxHealth && mc.mode === 'foot' && mc.respawnTimer === 0,
  `hp=${player.health}, mode=${mc.mode}`)

// ---------- 9. SOFTLOCK SWEEP (2 min mixed input, no exceptions/NaN) ----------
console.log('--- 9. Softlock sweep (120s mixed input) ---')
let threw = null
const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space']
try {
  for (let i = 0; i < 120 * 60; i++) {
    const dt = DT
    if (i % 40 === 0) {
      // random-ish input bursts (core verbs: move, steer, jump, shoot, enter/exit)
      const held = keys[Math.floor(Math.random() * keys.length)]
      input.setVirtualKey(held, true)
      if (i % 200 === 0) input.injectClick()
      if (i % 500 === 0) input.pressVirtualKey('KeyE')
    }
    if (i % 45 === 0) input.setVirtualKey(keys[Math.floor(Math.random() * keys.length)], false)
    mc.update(dt, worldStub.getCollidables())
    cameraRig.update(dt, input, mc.activePosition, [])
    missions.update(dt)
    input.endFrame()
  }
} catch (err) {
  threw = err
}
ok('120s mixed-input run throws nothing', threw === null, threw ? String(threw) : '')
const sweepFinite = [player, ...vehicles.vehicles, ...enemies.enemies].every(e =>
  finite(e.position.x) && finite(e.position.y) && finite(e.position.z))
ok('positions finite after sweep', sweepFinite)
ok('mode stays valid (foot|driving, driving has a vehicle)',
  (mc.mode === 'foot' || (mc.mode === 'driving' && mc.vehicle !== null)), `mode=${mc.mode}`)

// ---------- 10. INVARIANTS ----------
console.log('--- 10. Invariants (no NaN / no runaway entities) ---')
const allFinite = [player, ...vehicles.vehicles, ...enemies.enemies, ...peds.pedestrians, ...traffic.cars.map(c => c.vehicle)]
  .every(e => finite(e.position.x) && finite(e.position.y) && finite(e.position.z))
ok('all entity positions finite', allFinite)
ok('enemies still alive & countable', enemies.aliveCount > 0 && enemies.aliveCount <= enemies.enemies.length)
ok('pedestrians alive', peds.alive.length > 0)
ok('no NaN in weapons ammo', Number.isFinite(weapons.mag) && Number.isFinite(weapons.reserve))

console.log(`\n=== PLAYTEST RESULT: ${pass} passed, ${fail} failed ===`)
process.exit(fail > 0 ? 1 : 0)
