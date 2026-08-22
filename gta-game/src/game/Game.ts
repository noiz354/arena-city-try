import {
  ACESFilmicToneMapping,
  Clock,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { World } from './World'
import { Player } from '../entities/Player'
import { Vehicle } from '../entities/Vehicle'
import { CameraRig } from '../systems/CameraRig'
import { InputManager } from '../utils/InputManager'
import { VehicleManager } from '../systems/VehicleManager'
import { EnemySystem } from '../systems/EnemySystem'
import { WeaponSystem } from '../systems/WeaponSystem'
import { PickupSystem } from '../systems/PickupSystem'
import { WEAPON_LIST } from '../data/weapons'

export interface GameOptions {
  container: HTMLElement
}

type PlayerMode = 'foot' | 'driving'

const SPAWN_X = 0
const SPAWN_Z = 0
const ATTACK_RANGE = 2.4
const ENEMY_ATTACK_DAMAGE = 8

/**
 * Core game shell — adapted from the mavonengine-core BaseGame/Game pattern.
 * Owns renderer, camera, scene, input, player, vehicles, enemies, weapons,
 * pickups, and the animation loop.
 */
export class Game {
  readonly clock = new Clock()
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly world: World
  readonly player: Player
  readonly cameraRig: CameraRig
  readonly input: InputManager
  readonly vehicles: VehicleManager
  readonly enemies: EnemySystem
  readonly weapons: WeaponSystem
  readonly pickups: PickupSystem

  mode: PlayerMode = 'foot'
  vehicle: Vehicle | null = null
  nearestVehicle: Vehicle | null = null
  kills = 0
  respawnTimer = 0
  /** HUD hooks — wired from main.ts */
  onPlayerDamaged?: () => void
  onWeaponHit?: () => void
  onPickup?: (message: string) => void
  private readonly exitOffset = new Vector3()

  private readonly updateCallbacks = new Set<(delta: number) => void>()
  private animationId = 0
  private running = false

  constructor({ container }: GameOptions) {
    // --- Renderer ---
    this.renderer = new WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    container.appendChild(this.renderer.domElement)

    // --- Camera ---
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1)
    this.camera = new PerspectiveCamera(60, aspect, 0.1, 2000)
    this.camera.position.set(28, 22, 38)
    this.camera.lookAt(0, 2, 0)

    // --- Input ---
    this.input = new InputManager()
    this.input.attach(container)

    // --- World ---
    this.world = new World()
    this.scene.fog = this.world.fog
    this.scene.background = this.world.skyColor
    this.scene.add(this.world.root)

    // --- Player + third-person camera rig ---
    this.player = new Player()
    this.player.group.position.set(SPAWN_X, 0.95, SPAWN_Z)
    this.scene.add(this.player.group)
    this.world.update(this.player.position.x, this.player.position.z)

    // --- Parked vehicles ---
    this.vehicles = new VehicleManager()
    for (const v of this.vehicles.vehicles) this.scene.add(v.group)

    // --- Enemies ---
    this.enemies = new EnemySystem()
    this.scene.add(this.enemies.group)

    // --- Weapons ---
    this.weapons = new WeaponSystem(
      this.scene,
      this.camera,
      this.input,
      this.enemies,
      () => this.world.getCollidables().concat(this.vehicles.getCollidables()),
      {
        onHit: () => this.onWeaponHit?.(),
        onKill: () => {
          this.kills++
        },
      },
    )

    // --- Pickups ---
    this.pickups = new PickupSystem(
      this.scene,
      () => this.player.position,
      {
        onWeapon: id => {
          this.weapons.giveWeapon(id)
          this.onPickup?.(`${WEAPON_LIST.find(w => w.id === id)?.name ?? id} acquired!`)
        },
        onAmmo: () => {
          this.weapons.giveAmmo(0.4)
          this.onPickup?.('+ AMMO')
        },
      },
    )
    this.enemies.onEnemyDeath = enemy => {
      this.pickups.spawnAmmo(enemy.position.x, enemy.position.z)
    }
    this.spawnInitialPickups()

    this.cameraRig = new CameraRig(this.camera)

    // --- Resize ---
    window.addEventListener('resize', this.resize)

    this.clock.start()
  }

  onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.add(callback)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.loop()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.animationId)
  }

  destroy(): void {
    this.stop()
    this.input.detach()
    window.removeEventListener('resize', this.resize)
    this.world.dispose()
    this.vehicles.dispose()
    this.renderer.dispose()
  }

  private loop = (): void => {
    if (!this.running) return
    this.animationId = requestAnimationFrame(this.loop)

    const delta = Math.min(this.clock.getDelta(), 0.05)
    this.update(delta)
  }

  private update(delta: number): void {
    const px = this.mode === 'driving' ? this.vehicle!.position.x : this.player.position.x
    const pz = this.mode === 'driving' ? this.vehicle!.position.z : this.player.position.z
    this.world.update(px, pz)
    this.world.updateSun(px, pz)
    this.vehicles.update(px, pz)

    const buildings = this.world.getCollidables()

    this.enemies.update(delta, this.player.position, buildings)
    this.pickups.update(delta)
    this.weapons.update(delta)

    if (this.mode === 'foot') {
      this.updateOnFoot(delta, buildings)
    } else {
      this.updateDriving(delta)
    }

    this.handlePlayerDeath(delta)

    this.updateCallbacks.forEach(cb => cb(delta))
    this.renderer.render(this.scene, this.camera)

    this.input.endFrame()
  }

  private updateOnFoot(delta: number, buildings: ReturnType<World['getCollidables']>): void {
    const all = buildings.concat(this.vehicles.getCollidables())
    this.player.update(delta, this.input, this.cameraRig.yaw, all)
    this.cameraRig.followYaw = null
    this.cameraRig.update(delta, this.input, this.player.position, all)
    this.weapons.enabled = true

    // weapon switching + reload
    for (const def of WEAPON_LIST) {
      if (this.input.wasPressed(`Digit${def.key}`)) this.weapons.switchWeapon(def.id)
    }
    if (this.input.wasPressed('KeyR')) this.weapons.startReload()

    // enemy melee attacks
    for (const enemy of this.enemies.alive) {
      if (!enemy.lastAttacked) continue
      const dx = enemy.position.x - this.player.position.x
      const dz = enemy.position.z - this.player.position.z
      if (dx * dx + dz * dz < ATTACK_RANGE * ATTACK_RANGE) {
        this.player.takeDamage(ENEMY_ATTACK_DAMAGE)
        this.onPlayerDamaged?.()
      }
    }

    this.nearestVehicle = this.vehicles.getNearest(this.player.position.x, this.player.position.z)
    if (this.nearestVehicle && this.input.wasPressed('KeyE')) {
      this.enterVehicle(this.nearestVehicle)
    }
  }

  private updateDriving(delta: number): void {
    const v = this.vehicle!
    const all = this.world.getCollidables().concat(this.vehicles.getCollidables(v))
    this.weapons.enabled = false

    const throttle = (this.input.isDown('KeyW') ? 1 : 0) - (this.input.isDown('KeyS') ? 1 : 0)
    const steer = (this.input.isDown('KeyD') ? 1 : 0) - (this.input.isDown('KeyA') ? 1 : 0)
    v.update(delta, { throttle, steer }, all)

    this.cameraRig.followYaw = v.yaw
    this.cameraRig.update(delta, this.input, v.position, all)

    this.nearestVehicle = null
    if (this.input.wasPressed('KeyE')) this.exitVehicle()
  }

  private enterVehicle(v: Vehicle): void {
    this.vehicle = v
    v.occupied = true
    v.speed = 0
    this.mode = 'driving'
    this.player.group.visible = false
    this.cameraRig.onEnterVehicle(v.yaw)
  }

  private exitVehicle(): void {
    const v = this.vehicle!
    this.exitOffset.set(Math.cos(v.yaw), 0, -Math.sin(v.yaw))
    this.player.group.position.copy(v.position).addScaledVector(this.exitOffset, 2.8)
    this.player.group.position.y = 0.95
    this.player.velocity.set(0, 0, 0)

    v.occupied = false
    this.vehicle = null
    this.mode = 'foot'
    this.player.group.visible = true
    this.cameraRig.onExitVehicle()
  }

  private handlePlayerDeath(delta: number): void {
    if (this.respawnTimer > 0) {
      this.respawnTimer -= delta
      if (this.respawnTimer <= 0) {
        this.player.respawnAt(SPAWN_X, SPAWN_Z)
      }
      return
    }
    if (this.player.health <= 0) {
      this.respawnTimer = 3
    }
  }

  private spawnInitialPickups(): void {
    this.pickups.spawnWeapon('smg', -14, 14)
    this.pickups.spawnWeapon('shotgun', 14, -14)
    this.pickups.spawnWeapon('rifle', 45, -30)
    this.pickups.spawnAmmo(-20, -20)
    this.pickups.spawnAmmo(30, 40)
  }

  private resize = (): void => {
    const container = this.renderer.domElement.parentElement
    if (!container) return
    const width = container.clientWidth
    const height = Math.max(container.clientHeight, 1)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
}
