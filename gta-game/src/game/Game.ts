import {
  ACESFilmicToneMapping,
  Clock,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
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
import { WeaponView } from '../systems/WeaponView'
import { SaveManager } from '../systems/SaveManager'
import { Vegetation } from '../systems/Vegetation'
import { WetSurfaceSystem } from '../systems/WetSurfaceSystem'
import { ColliderDebug } from '../systems/ColliderDebug'
import { PauseMenu } from '../ui/pauseMenu'
import { ModeController, SPAWN_X, SPAWN_Z } from '../systems/ModeController'
import type { GameTelemetry } from '../analytics/gameTelemetry'
import { WEAPON_LIST } from '../data/weapons'
import { ecsWorld } from '../ecs/world'
import { updateBullets } from '../ecs/systems'
import { SpatialHash } from '../utils/SpatialHash'

export interface GameOptions {
  container: HTMLElement
}

/**
 * Core game shell — adapted from the mavonengine-core BaseGame/Game pattern.
 * Owns the renderer/camera/scene, wires all systems together, and runs the
 * animation loop. The foot/driving player state machine lives in
 * ModeController (A-1 refactor); Game.ts focuses on orchestration.
 */
export class Game {
  readonly clock = new Clock()
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly ecs = ecsWorld
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
  readonly vegetation: Vegetation
  readonly wet: WetSurfaceSystem
  readonly colliderDebug: ColliderDebug
  readonly particles: ParticleSystem
  readonly postfx: PostFX
  readonly quality: AutoQuality
  readonly mobile: MobileControls
  readonly weaponView: WeaponView
  readonly saveManager: SaveManager
  readonly pauseMenu: PauseMenu
  readonly modeCtrl: ModeController

  kills = 0
  paused = false
  private saveTimer = 30
  private readonly exploded = new Set<Vehicle>()
  private readonly trafficHash = new SpatialHash()
  private lastWantedStars = 0
  /** Analytics wiring — set from main.ts. */
  telemetry?: GameTelemetry
  /** HUD hooks — wired from main.ts */
  onPlayerDamaged?: () => void
  onWeaponHit?: () => void
  onPickup?: (message: string) => void
  onDialogue?: (line: string) => void
  onObjective?: (text: string) => void

  private readonly updateCallbacks = new Set<(delta: number) => void>()
  private animationId = 0
  private running = false

  // --- public API kept for HUD/main (delegates to ModeController) ---

  get mode(): 'foot' | 'driving' {
    return this.modeCtrl.mode
  }

  get vehicle(): Vehicle | null {
    return this.modeCtrl.vehicle
  }

  get nearestVehicle(): Vehicle | null {
    return this.modeCtrl.nearestVehicle
  }

  get respawnTimer(): number {
    return this.modeCtrl.respawnTimer
  }

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
    this.dayNight = new DayNightSystem(
      this.world.sun,
      ambient,
      this.world.hemi,
      moon,
      this.world.skyColor,
      this.world.fog,
      this.world.sky,
    )
    this.weather = new WeatherSystem(this.scene, this.world.fog)
    this.vegetation = new Vegetation()
    this.scene.add(this.vegetation.root)

    // rain → wet surfaces (shares the WeatherSystem envelope)
    this.wet = new WetSurfaceSystem(this.world.groundMaterial, () => this.weather.rainAmount)
    for (const m of this.wet.meshes) this.scene.add(m)

    // debug collider visualizer (off by default; F3 toggles)
    this.colliderDebug = new ColliderDebug()
    this.scene.add(this.colliderDebug.root)
    this.particles = new ParticleSystem(this.scene)
    this.mobile = new MobileControls(this.input)

    // --- Player + third-person camera rig + weapon viewmodel ---
    this.player = new Player()
    this.player.group.position.set(SPAWN_X, 0.95, SPAWN_Z)
    this.scene.add(this.player.group)
    this.world.update(this.player.position.x, this.player.position.z)

    this.weaponView = new WeaponView()
    this.player.group.add(this.weaponView.holder)

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
    this.missions.hooks.onMissionStart = def => {
      this.onPickup?.(`MISSION: ${def.name}`)
      this.telemetry?.missionStart(def.id, def.name)
    }
    this.missions.hooks.onMissionComplete = (def, reward) => {
      this.audio.playMissionComplete()
      this.onPickup?.(`MISSION COMPLETE: ${def.name} · +$${reward}`)
      this.telemetry?.missionComplete(def.id, def.name, reward)
      this.save()
    }
    this.missions.hooks.onObjective = (_def, text) => this.onObjective?.(text)

    this.minimap = new MinimapSystem()

    // --- Save manager + pause menu ---
    this.saveManager = new SaveManager()
    this.pauseMenu = new PauseMenu({
      onResume: () => this.setPaused(false),
      onRestart: () => this.restart(),
      onToggleMute: () => this.audio.setMuted(!this.audio.muted),
      isMuted: () => this.audio.muted,
      stats: () => this.pauseStats(),
    })

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
          this.weaponView.kick()
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
          this.telemetry?.kill(kind, this.weapons.currentDef.id)
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
          this.weaponView.setWeapon(id)
          this.audio.playPickup()
          this.telemetry?.weaponAcquired(id)
          this.onPickup?.(`${WEAPON_LIST.find(w => w.id === id)?.name ?? id} acquired!`)
        },
        onAmmo: () => {
          this.weapons.giveAmmo(0.4)
          this.audio.playPickup()
          this.telemetry?.ammoPickup()
          this.onPickup?.('+ AMMO')
        },
      },
    )
    this.enemies.onEnemyDeath = enemy => {
      this.pickups.spawnAmmo(enemy.position.x, enemy.position.z)
      if (enemy.role === 'cop') this.wanted.reportCrime(3, this.player.position)
    }
    this.spawnInitialPickups()
    this.loadSave()
    this.weaponView.setWeapon(this.weapons.currentWeaponId)

    this.cameraRig = new CameraRig(this.camera)

    // --- Player mode state machine ---
    this.modeCtrl = new ModeController({
      player: this.player,
      cameraRig: this.cameraRig,
      input: this.input,
      vehicles: this.vehicles,
      traffic: this.traffic,
      world: this.world,
      missions: this.missions,
      weapons: this.weapons,
      weaponView: this.weaponView,
      enemies: this.enemies,
      audio: this.audio,
      postfx: this.postfx,
      telemetry: () => this.telemetry,
      onPlayerDamaged: () => this.onPlayerDamaged?.(),
    })

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
    this.save() // persist progress when the session ends
    this.stop()
    this.input.detach()
    window.removeEventListener('resize', this.resize)
    this.world.dispose()
    this.vegetation.dispose()
    this.wet.dispose()
    this.colliderDebug.dispose()
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

    if (this.input.wasPressed('Escape')) this.setPaused(!this.paused)

    if (!this.paused) this.update(delta)

    this.input.endFrame()
  }

  private update(delta: number): void {
    // spatial audio listener follows the camera
    this.audio.setListener(this.camera.position, this.camera.quaternion)

    const pos = this.modeCtrl.activePosition
    this.world.update(pos.x, pos.z)
    // day/night must run first: it computes the shared sun direction + light
    // colors, which updateSun then uses to position the light/shadow frustum
    this.dayNight.update(delta)
    this.world.updateSun(pos.x, pos.z, this.dayNight.sunDirection)
    this.vehicles.update(pos.x, pos.z)

    const buildings = this.world.getCollidables()
    const allCollidables = buildings.concat(this.vehicles.getCollidables())

    // debug: F3 toggles the collider wireframe visualizer
    if (this.input.wasPressed('F3')) this.colliderDebug.toggle()
    this.colliderDebug.update(delta, allCollidables)

    // enemy LOS only needs buildings near the chase area (spatial query, not full list)
    const losBuildings = this.world.chunks.queryCircle(this.player.position.x, this.player.position.z, 70)
    this.enemies.update(delta, this.player.position, losBuildings)
    this.pedestrians.update(delta, buildings)
    this.traffic.update(delta, pos.x, pos.z, allCollidables)
    // rebuild spatial hash for traffic cars (O(n), cell 16) — ponytail: 3x3 scan
    this.trafficHash.clear()
    for (let i = 0; i < this.traffic.cars.length; i++) {
      const c = this.traffic.cars[i]
      if (!c.vehicle.group.visible) continue
      this.trafficHash.insert(i, c.vehicle.position.x, c.vehicle.position.z)
    }
    this.checkCarPedestrianCollisions()
    this.checkTrafficPlayerCollision()
    this.pickups.update(delta)
    this.weapons.update(delta)
    this.ecs.dt = delta; this.ecs.time += delta
    updateBullets(delta)

    // player mode state machine (foot/driving + enter/exit + death/respawn)
    this.modeCtrl.update(delta, buildings)
    if (this.modeCtrl.mode === 'foot') this.wanted.update(delta, this.player.position)

    // civilian dialogue
    if (this.modeCtrl.mode === 'foot' && this.player.health > 0) {
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

    // wanted-level telemetry (fires only when the stars change)
    if (this.wanted.stars !== this.lastWantedStars) {
      this.lastWantedStars = this.wanted.stars
      this.telemetry?.wantedChanged(this.wanted.stars)
    }

    // weapon viewmodel (bob + recoil; hidden while driving via player group)
    const pv = this.player.velocity
    this.weaponView.update(delta, this.modeCtrl.mode === 'foot' && Math.hypot(pv.x, pv.z) > 0.5, Math.min(1, Math.hypot(pv.x, pv.z) / 9.5))

    // --- polish systems (day/night already updated above, before updateSun) ---
    this.weather.update(delta, this.camera.position)
    this.vegetation.update(this.clock.elapsedTime)
    this.wet.update(delta)
    this.particles.update(delta)
    this.updateExplosions()
    this.updateEngineAudio()
    // single-owner exposure: scene-light model (day amount) → tone-map exposure // ponytail: 0.70+0.35*day flatter than 0.55+0.6*day to avoid noon blow
    this.postfx.setExposure(0.7 + this.dayNight.day * 0.35)
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
  }

  /** Explode + smoke on newly wrecked vehicles (spatial boom at the car). */
  private updateExplosions(): void {
    for (const v of this.vehicles.vehicles) {
      if (v.wrecked && !this.exploded.has(v)) {
        this.exploded.add(v)
        this.particles.explosion(v.position, 1)
        this.audio.playExplosionAt(v.position)
        this.postfx.addShake(0.9)
      } else if (v.wrecked) {
        this.particles.smoke(v.position, 1 / 60)
      }
    }
  }

  private updateEngineAudio(): void {
    const v = this.modeCtrl.vehicle
    if (this.modeCtrl.mode === 'driving' && v) {
      this.audio.setEngine(!v.wrecked, Math.abs(v.speed) / v.config.maxSpeed)
    } else {
      this.audio.setEngine(false, 0)
    }
    if (this.input.wasPressed('KeyM')) this.audio.setMuted(!this.audio.muted)
  }

  /**
   * Cars running over pedestrians: knock-down / kill by impact speed, slow the
   * car, and raise wanted stars (driving recklessly is a crime too).
   */
  private checkCarPedestrianCollisions(): void {
    const now = performance.now()
    for (const ped of this.pedestrians.pedestrians) {
      if (ped.dead || now - ped.carHitAt < 400) continue
      const px = ped.position.x
      const pz = ped.position.z
      for (const v of this.vehicles.vehicles) {
        if (!v.group.visible) continue
        const speed = Math.abs(v.speed)
        if (speed < 2.5) continue
        const dx = v.position.x - px
        const dz = v.position.z - pz
        const hitR = Math.max(v.config.width, v.config.length) * 0.6 + 0.35
        if (dx * dx + dz * dz < hitR * hitR) {
          const killed = ped.runOver(speed)
          v.speed *= 0.72
          ped.carHitAt = now
          this.postfx.addShake(killed ? 0.5 : 0.2)
          if (killed) {
            this.wanted.reportCrime(2, this.player.position)
            this.audio.playDamage()
          } else {
            this.wanted.reportCrime(1, this.player.position)
          }
          break
        }
      }
    }
  }

  private updateMinimap(): void {
    this.minimap.update(
      this.modeCtrl.activePosition,
      this.modeCtrl.activeYaw,
      this.missions.waypoint(),
      this.missions.markerPositions(),
    )
  }

  /**
   * On-foot player hit by fast traffic: damage + knockback in the car's travel
   * direction. Makes passing cars a real dodge challenge instead of letting the
   * player no-clip through them. Cooldown-gated so one hit isn't applied every
   * frame.
   */
  private lastTrafficHit = 0
  private checkTrafficPlayerCollision(): void {
    if (this.modeCtrl.mode !== 'foot' || this.player.health <= 0) return
    const now = performance.now()
    if (now - this.lastTrafficHit < 400) return

    const p = this.player.position
    const cand = this.trafficHash.queryRadius(p.x, p.z, 12)
    for (const idx of cand) {
      const car = this.traffic.cars[idx]; if (!car) continue
      const v = car.vehicle
      if (!v.group.visible) continue
      const speed = Math.abs(v.speed)
      if (speed < 2.5) continue
      const b = v.getCollidableBox()
      const r = 0.45 // player radius
      if (p.x < b.min.x - r || p.x > b.max.x + r || p.z < b.min.z - r || p.z > b.max.z + r) continue

      // hit — damage scales with speed, capped
      this.player.takeDamage(Math.min(40, Math.round((speed - 2.5) * 6)))
      this.onPlayerDamaged?.()
      this.audio.playDamage()
      this.postfx.addShake(0.4)
      this.lastTrafficHit = now
      // fling the player away in the car's travel direction
      this.player.velocity.set(Math.sin(v.yaw) * speed * 0.6, 3.5, Math.cos(v.yaw) * speed * 0.6)
      this.player.grounded = false
      break
    }
  }

  /** Full save: profile + player state + weapon inventory (localStorage). */
  save(): void {
    this.saveManager.save({
      profile: this.missions.serialize(),
      pos: { x: this.player.position.x, z: this.player.position.z },
      health: this.player.health,
      kills: this.kills,
      weapons: this.weapons.serialize(),
    })
  }

  private loadSave(): void {
    const data = this.saveManager.load()
    if (!data) return
    if (data.profile) this.missions.deserialize(data.profile)
    if (data.pos) this.player.group.position.set(data.pos.x, 0.95, data.pos.z)
    if (typeof data.health === 'number') this.player.health = data.health
    if (typeof data.kills === 'number') this.kills = data.kills
    if (data.weapons) this.weapons.deserialize(data.weapons)
  }

  /** ESC toggling / menu button. */
  setPaused(paused: boolean): void {
    if (this.paused === paused) return
    this.paused = paused
    this.pauseMenu.setVisible(paused)
    this.input.clearTransient() // don't let a stray click fire after resume
  }

  /** Restart: wipe the save and reload the page. */
  restart(): void {
    this.saveManager.clear()
    window.location.reload()
  }

  private pauseStats(): string {
    const m = this.missions.profile
    return `MONEY $${m.money} · LEVEL ${m.level} · KILLS ${this.kills} · WANTED ${'★'.repeat(this.wanted.stars) || '—'}`
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
