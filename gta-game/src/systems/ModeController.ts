import { Vector3 } from 'three'
import type { Player } from '../entities/Player'
import type { Vehicle } from '../entities/Vehicle'
import type { CameraRig } from './CameraRig'
import type { InputManager } from '../utils/InputManager'
import type { VehicleManager } from './VehicleManager'
import type { TrafficSystem } from './TrafficSystem'
import type { World } from '../game/World'
import type { MissionSystem } from './MissionSystem'
import type { WeaponSystem } from './WeaponSystem'
import type { WeaponView } from './WeaponView'
import type { EnemySystem } from './EnemySystem'
import type { AudioManager } from './AudioManager'
import type { PostFX } from './PostFX'
import type { GameTelemetry } from '../analytics/gameTelemetry'
import { WEAPON_LIST } from '../data/weapons'

export type PlayerMode = 'foot' | 'driving'

export const SPAWN_X = 0
export const SPAWN_Z = 0
const ATTACK_RANGE = 2.4

/** Everything ModeController needs from the rest of the game. */
export interface ModeControllerDeps {
  player: Player
  cameraRig: CameraRig
  input: InputManager
  vehicles: VehicleManager
  traffic: TrafficSystem
  world: World
  missions: MissionSystem
  weapons: WeaponSystem
  weaponView: WeaponView
  enemies: EnemySystem
  audio: AudioManager
  postfx: PostFX
  /** Lazy — the Game sets its telemetry field after construction. */
  telemetry?: () => GameTelemetry | undefined
  onPlayerDamaged?: () => void
}

/**
 * Player mode state machine (A-1 refactor): owns the foot/driving switch,
 * vehicle enter/exit placement, on-foot input (weapons, melee, mission zones,
 * vehicle entry) and driving input (throttle/steer, exit), plus death/respawn.
 * Game.ts keeps system wiring + rendering; this owns *how the player acts*.
 */
export class ModeController {
  mode: PlayerMode = 'foot'
  vehicle: Vehicle | null = null
  nearestVehicle: Vehicle | null = null
  respawnTimer = 0
  private readonly exitOffset = new Vector3()

  constructor(private readonly deps: ModeControllerDeps) {}

  private get telemetry(): GameTelemetry | undefined {
    return this.deps.telemetry?.()
  }

  /** Position the camera/world should track (car while driving, else player). */
  get activePosition(): Vector3 {
    return this.vehicle ? this.vehicle.position : this.deps.player.position
  }

  /** Yaw the camera should follow (car heading while driving). */
  get activeYaw(): number {
    return this.vehicle ? this.vehicle.yaw : this.deps.player.yaw
  }

  /** Tick the current mode + death/respawn timer. */
  update(delta: number, buildings: ReturnType<World['getCollidables']>): void {
    if (this.mode === 'foot') this.updateOnFoot(delta, buildings)
    else this.updateDriving(delta)
    this.handlePlayerDeath(delta)
  }

  // --- on foot ---

  private updateOnFoot(delta: number, buildings: ReturnType<World['getCollidables']>): void {
    const { player, cameraRig, input, vehicles, weapons, weaponView } = this.deps
    const all = buildings.concat(vehicles.getCollidables())
    player.update(delta, input, cameraRig.yaw, all)
    cameraRig.followYaw = null
    cameraRig.update(delta, input, player.position, all)
    weapons.enabled = true

    // weapon switching + reload
    for (const def of WEAPON_LIST) {
      if (input.wasPressed(`Digit${def.key}`)) {
        weapons.switchWeapon(def.id)
        weaponView.setWeapon(def.id)
      }
    }
    if (input.wasPressed('KeyR')) weapons.startReload()

    // enemy melee attacks (thugs 8, cops 5)
    for (const enemy of this.deps.enemies.alive) {
      if (!enemy.lastAttacked) continue
      const dx = enemy.position.x - player.position.x
      const dz = enemy.position.z - player.position.z
      if (dx * dx + dz * dz < ATTACK_RANGE * ATTACK_RANGE) {
        player.takeDamage(enemy.attackDamage)
        this.deps.audio.playDamage()
        this.deps.postfx.addShake(0.3)
        this.deps.onPlayerDamaged?.()
      }
    }

    // mission start zone interaction
    if (!this.deps.missions.active && input.wasPressed('KeyE')) {
      const zone = this.deps.missions.zoneAt(player.position.x, player.position.z)
      if (zone) this.deps.missions.startMission(zone)
    }

    // nearest enterable vehicle: parked or traffic
    this.nearestVehicle =
      vehicles.getNearest(player.position.x, player.position.z) ??
      this.deps.traffic.getNearest(player.position.x, player.position.z)
    if (this.nearestVehicle && input.wasPressed('KeyE')) {
      this.enterVehicle(this.nearestVehicle)
    }
  }

  // --- driving ---

  private updateDriving(delta: number): void {
    const { vehicle: v } = this
    if (!v) {
      // safety: no vehicle but mode=driving → back to foot
      this.mode = 'foot'
      return
    }
    const { input, cameraRig, weapons, world, vehicles, missions } = this.deps
    const all = world.getCollidables().concat(vehicles.getCollidables(v))
    weapons.enabled = false

    const throttle = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0)
    const steer = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0)
    v.update(delta, { throttle, steer }, all)

    cameraRig.followYaw = v.yaw
    cameraRig.update(delta, input, v.position, all)

    // mission start zone interaction while driving too
    if (!missions.active && input.wasPressed('KeyE')) {
      const zone = missions.zoneAt(v.position.x, v.position.z)
      if (zone) missions.startMission(zone)
    }

    this.nearestVehicle = null
    if (input.wasPressed('KeyE')) this.exitVehicle()
  }

  // --- mode transitions ---

  enterVehicle(v: Vehicle): void {
    this.vehicle = v
    v.occupied = true
    v.stolen = true
    v.speed = 0
    this.mode = 'driving'
    this.deps.player.group.visible = false
    this.deps.cameraRig.onEnterVehicle(v.yaw)
    this.telemetry?.vehicleEnter()
  }

  exitVehicle(): void {
    const v = this.vehicle
    if (!v) return
    this.exitOffset.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw))
    this.deps.player.group.position.copy(v.position).addScaledVector(this.exitOffset, 2.8)
    this.deps.player.group.position.y = 0.95
    this.deps.player.velocity.set(0, 0, 0)

    v.occupied = false
    this.vehicle = null
    this.mode = 'foot'
    this.deps.player.group.visible = true
    this.deps.cameraRig.onExitVehicle()
    this.telemetry?.vehicleExit()
  }

  // --- death / respawn ---

  private handlePlayerDeath(delta: number): void {
    if (this.respawnTimer > 0) {
      this.respawnTimer -= delta
      if (this.respawnTimer <= 0) {
        this.deps.player.respawnAt(SPAWN_X, SPAWN_Z)
        this.telemetry?.playerRespawn()
      }
      return
    }
    if (this.deps.player.health <= 0) {
      this.respawnTimer = 3
      this.telemetry?.playerDied()
    }
  }
}
