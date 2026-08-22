import {
  ACESFilmicToneMapping,
  Clock,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import { AmbientLight, DirectionalLight } from 'three'
import { World } from './World'
import { Player } from '../entities/Player'
import { Vehicle } from '../entities/Vehicle'
import { CameraRig } from '../systems/CameraRig'
import { InputManager } from '../utils/InputManager'
import { VehicleManager } from '../systems/VehicleManager'
import { EnemySystem } from '../systems/EnemySystem'
import { WeaponSystem } from '../systems/WeaponSystem'
import { PickupSystem } from '../systems/PickupSystem'
import { PedestrianSystem } from '../systems/PedestrianSystem'
import { TrafficSystem } from '../systems/TrafficSystem'
import { WantedSystem } from '../systems/WantedSystem'
import { MissionSystem } from '../systems/MissionSystem'
import { MinimapSystem } from '../systems/MinimapSystem'
import { AudioManager } from '../systems/AudioManager'
import { DayNightSystem } from '../systems/DayNightSystem'
import { WeatherSystem } from '../systems/WeatherSystem'
import { ParticleSystem } from '../systems/ParticleSystem'
import { PostFX } from '../systems/PostFX'
import { AutoQuality } from '../systems/AutoQuality'
import { MobileControls } from '../systems/MobileControls'
import { WEAPON_LIST } from '../data/weapons'

const SAVE_KEY = 'cityrush_save_v1'

export interface GameOptions {
  container: HTMLElement
}

type PlayerMode = 'foot' | 'driving'

const SPAWN_X = 0
const SPAWN_Z = 0
const ATTACK_RANGE = 2.4

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
  readonly pedestrians: PedestrianSystem
  readonly traffic: TrafficSystem
  readonly wanted: WantedSystem
  readonly missions: MissionSystem
  readonly minimap: MinimapSystem
  readonly audio: AudioManager
  readonly dayNight: DayNightSystem
  readonly weather: WeatherSystem
  readonly particles: ParticleSystem
  readonly postfx: PostFX
  readonly quality: AutoQuality
  readonly mobile: MobileControls

  mode: PlayerMode = 'foot'
  vehicle: Vehicle | null = null
  nearestVehicle: Vehicle | null = null
  kills = 0
  respawnTimer = 0
  private saveTimer = 30
  private readonly exploded = new Set<Vehicle>()
  /** HUD hooks — wired from main.ts */
  onPlayerDamaged?: () => void
  onWeaponHit?: () => void
  onPickup?: (message: string) => void
  onDialogue?: (line: string) => void
  onObjective?: (text: string) => void
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

    // --- Polish: audio, day/night, weather, particles, post-processing ---
    this.audio = new AudioManager()
    this.postfx = new PostFX(this.renderer, this.scene, this.camera)
    this.quality = new AutoQuality(this.renderer, this.postfx)

    // moon light (dim, fills the night)
    const moon = new DirectionalLight(0x8fa8ff, 0.3)
    moon.position.set(-80, 60, -40)
    this.scene.add(moon)
    const ambient = this.world.root.children.find(c => c instanceof AmbientLight) as AmbientLight
    this.dayNight = new DayNightSystem(this.world.sun, ambient, moon, this.world.skyColor, this.world.fog)
    this.weather = new WeatherSystem(this.scene, this.world.fog)
    this.particles = new ParticleSystem(this.scene)
    this.mobile = new MobileControls(this.input)

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

    // --- Pedestrians + traffic + wanted ---
    this.pedestrians = new PedestrianSystem()
    this.scene.add(this.pedestrians.group)

    this.traffic = new TrafficSystem()
    for (const car of this.traffic.cars) this.scene.add(car.vehicle.group)

    this.wanted = new WantedSystem(this.enemies)

    // --- Missions + minimap ---
    this.missions = new MissionSystem(
      this.enemies,
      () => this.player.position,
      () => this.traffic.cars.map(c => c.vehicle),
    )
    this.scene.add(this.missions.markers)
    this.missions.hooks.onMissionStart = def => this.onPickup?.(`MISSION: ${def.name}`)
    this.missions.hooks.onMissionComplete = (def, reward) => {
      this.audio.playMissionComplete()
      this.onPickup?.(`MISSION COMPLETE: ${def.name} · +$${reward}`)
      this.save()
    }
    this.missions.hooks.onObjective = (_def, text) => this.onObjective?.(text)

    this.minimap = new MinimapSystem()
    this.loadSave()

    // --- Weapons ---
    this.weapons = new WeaponSystem(
      this.scene,
      this.camera,
      this.input,
      this.enemies,
      () => this.world.getCollidables().concat(this.vehicles.getCollidables()),
      {
        onHit: () => {
          this.onWeaponHit?.()
          this.audio.playHit()
        },
        onShoot: weapon => {
          this.audio.playShoot(weapon)
          const p = this.player.position
          this.pedestrians.panicNear(p, 40)
          // firing near police officers counts as a crime
          for (const e of this.enemies.enemies) {
            if (e.role !== 'cop' || e.dead) continue
            const dx = e.position.x - p.x
            const dz = e.position.z - p.z
            if (dx * dx + dz * dz < 55 * 55) {
              this.wanted.reportCrime(1, p)
              break
            }
          }
        },
        onKill: kind => {
          this.kills++
          this.audio.playKill()
          if (kind === 'civilian') this.wanted.reportCrime(2, this.player.position)
        },
        onReload: () => this.audio.playReload(),
        onEmpty: () => this.audio.playEmpty(),
      },
      () => this.pedestrians.alive,
    )

    // --- Pickups ---
    this.pickups = new PickupSystem(
      this.scene,
      () => this.player.position,
      {
        onWeapon: id => {
          this.weapons.giveWeapon(id)
          this.audio.playPickup()
          this.onPickup?.(`${WEAPON_LIST.find(w => w.id === id)?.name ?? id} acquired!`)
        },
        onAmmo: () => {
          this.weapons.giveAmmo(0.4)
          this.audio.playPickup()
          this.onPickup?.('+ AMMO')
        },
      },
    )
    this.enemies.onEnemyDeath = enemy => {
      this.pickups.spawnAmmo(enemy.position.x, enemy.position.z)
      if (enemy.role === 'cop') this.wanted.reportCrime(3, this.player.position)
    }
    this.spawnInitialPickups()

    this.cameraRig = new CameraRig(this.camera)

    // --- Resize ---
    window.addEventListener('resize', this.resize)

    // unlock WebAudio on the first user gesture
    const unlock = (): void => {
      this.audio.ensure()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)

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
    this.traffic.dispose()
    this.wanted.dispose()
    this.particles.dispose()
    this.mobile.dispose()
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
    const allCollidables = buildings.concat(this.vehicles.getCollidables())

    this.enemies.update(delta, this.player.position, buildings)
    this.pedestrians.update(delta, buildings)
    this.traffic.update(delta, px, pz, allCollidables)
    this.pickups.update(delta)
    this.weapons.update(delta)

    if (this.mode === 'foot') {
      this.updateOnFoot(delta, buildings)
      this.wanted.update(delta, this.player.position)
    } else {
      this.updateDriving(delta)
    }

    // civilian dialogue
    if (this.mode === 'foot' && this.player.health > 0) {
      const line = this.pedestrians.maybeSpeak(this.player.position)
      if (line) this.onDialogue?.(line)
    }

    // missions + minimap
    this.missions.update(delta)
    this.updateMinimap()

    // auto-save every 30s
    this.saveTimer -= delta
    if (this.saveTimer <= 0) {
      this.saveTimer = 30
      this.save()
    }

    this.handlePlayerDeath(delta)

    // --- polish systems ---
    this.dayNight.update(delta)
    this.weather.update(delta, this.camera.position)
    this.particles.update(delta)
    this.updateExplosions()
    this.updateEngineAudio()
    this.postfx.update(delta)
    this.quality.frame()
    this.quality.update(delta)

    this.updateCallbacks.forEach(cb => cb(delta))

    this.postfx.applyShake(this.camera)
    if (this.postfx.enabled) {
      this.postfx.composer.render()
    } else {
      this.renderer.render(this.scene, this.camera)
    }
    this.postfx.restoreShake(this.camera)

    this.input.endFrame()
  }

  /** Explode + smoke on newly wrecked vehicles. */
  private updateExplosions(): void {
    for (const v of this.vehicles.vehicles) {
      if (v.wrecked && !this.exploded.has(v)) {
        this.exploded.add(v)
        this.particles.explosion(v.position, 1)
        this.audio.playExplosion()
        this.postfx.addShake(0.9)
      } else if (v.wrecked) {
        this.particles.smoke(v.position, 1 / 60)
      }
    }
  }

  private updateEngineAudio(): void {
    if (this.mode === 'driving' && this.vehicle) {
      const v = this.vehicle
      this.audio.setEngine(!v.wrecked, Math.abs(v.speed) / v.config.maxSpeed)
    } else {
      this.audio.setEngine(false, 0)
    }
    if (this.input.wasPressed('KeyM')) this.audio.setMuted(!this.audio.muted)
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

    // enemy melee attacks (thugs 8, cops 5)
    for (const enemy of this.enemies.alive) {
      if (!enemy.lastAttacked) continue
      const dx = enemy.position.x - this.player.position.x
      const dz = enemy.position.z - this.player.position.z
      if (dx * dx + dz * dz < ATTACK_RANGE * ATTACK_RANGE) {
        this.player.takeDamage(enemy.attackDamage)
        this.audio.playDamage()
        this.postfx.addShake(0.3)
        this.onPlayerDamaged?.()
      }
    }

    // mission start zone interaction
    if (!this.missions.active && this.input.wasPressed('KeyE')) {
      const zone = this.missions.zoneAt(this.player.position.x, this.player.position.z)
      if (zone) this.missions.startMission(zone)
    }

    // nearest enterable vehicle: parked or traffic
    this.nearestVehicle =
      this.vehicles.getNearest(this.player.position.x, this.player.position.z) ??
      this.traffic.getNearest(this.player.position.x, this.player.position.z)
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

    // mission start zone interaction while driving too
    if (!this.missions.active && this.input.wasPressed('KeyE')) {
      const zone = this.missions.zoneAt(v.position.x, v.position.z)
      if (zone) this.missions.startMission(zone)
    }

    this.nearestVehicle = null
    if (this.input.wasPressed('KeyE')) this.exitVehicle()
  }

  private enterVehicle(v: Vehicle): void {
    this.vehicle = v
    v.occupied = true
    v.stolen = true
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

  private updateMinimap(): void {
    const p = this.mode === 'driving' && this.vehicle ? this.vehicle.position : this.player.position
    const yaw = this.mode === 'driving' && this.vehicle ? this.vehicle.yaw : this.player.yaw
    this.minimap.update(p, yaw, this.missions.waypoint(), this.missions.markerPositions())
  }

  /** Save profile + player state to localStorage. */
  save(): void {
    try {
      const data = {
        profile: this.missions.serialize(),
        pos: { x: this.player.position.x, z: this.player.position.z },
        health: this.player.health,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    } catch {
      // storage unavailable — non-fatal
    }
  }

  private loadSave(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY)
      if (!raw) return
      const data = JSON.parse(raw) as { profile?: string; pos?: { x: number; z: number }; health?: number }
      if (data.profile) this.missions.deserialize(data.profile)
      if (data.pos) {
        this.player.group.position.set(data.pos.x, 0.95, data.pos.z)
      }
      if (typeof data.health === 'number') this.player.health = data.health
    } catch {
      // corrupt save — ignore
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
    this.postfx.setSize(width, height)
  }
}
