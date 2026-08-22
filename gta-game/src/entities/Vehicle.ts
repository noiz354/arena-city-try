import {
  Box3,
  BoxGeometry,
  CylinderGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { VehicleData } from '../data/vehicles'
import type { Collidable } from '../game/World'
import { CITY_HALF } from '../systems/CityGenerator'

const WORLD_HALF = CITY_HALF - 3
const IMPACT_DAMAGE_THRESHOLD = 5 // m/s
const IMPACT_DAMAGE_SCALE = 4.5 // health points per m/s over threshold

export interface VehicleControls {
  throttle: number // -1..1 (W/S or up/down)
  steer: number // -1..1 (A/D or left/right)
}

/**
 * Enterable car with racing-skill physics: acceleration/friction/gravity,
 * yaw steering with visual roll tilt, AABB collision vs buildings, impact
 * damage + health, and a procedural body (no GLTF asset needed in sandbox).
 */
export class Vehicle {
  readonly group = new Group()
  readonly config: VehicleData

  speed = 0 // signed scalar along forward
  yaw = 0
  health: number

  wrecked = false
  occupied = false
  /** Hijacked from traffic — AI never resumes driving it. */
  stolen = false
  private lastCollided = false
  private readonly cachedBox = new Box3()
  private readonly cachedBoxMin = new Vector3()
  private readonly cachedBoxMax = new Vector3()
  private boxDirty = true

  private readonly wheels: Mesh[] = []
  private readonly hitboxHalf: { x: number; z: number }

  constructor(config: VehicleData, x: number, z: number, yaw: number) {
    this.config = config
    this.health = config.maxHealth
    this.yaw = yaw
    this.hitboxHalf = { x: config.width / 2, z: config.length / 2 }

    this.buildBody(config)
    this.group.position.set(x, 0, z)
    this.group.rotation.y = yaw
  }

  get position(): Vector3 {
    return this.group.position
  }

  /** Reusable forward vector (fills the passed target to avoid allocation). */
  forwardInto(target: Vector3): Vector3 {
    return target.set(Math.sin(this.yaw), 0, Math.cos(this.yaw))
  }

  get speedKmh(): number {
    return Math.abs(this.speed) * 3.6
  }

  /**
   * AABB footprint for vehicle-vs-vehicle and camera collision. Cached and
   * recomputed only when the vehicle moved/turned (no per-frame allocation).
   */
  getCollidableBox(): Box3 {
    if (this.boxDirty) {
      const p = this.group.position
      // approximate rotated footprint with an axis-aligned box (safe margin)
      const cos = Math.abs(Math.cos(this.yaw))
      const sin = Math.abs(Math.sin(this.yaw))
      const rx = this.hitboxHalf.x * cos + this.hitboxHalf.z * sin
      const rz = this.hitboxHalf.x * sin + this.hitboxHalf.z * cos
      this.cachedBoxMin.set(p.x - rx, 0, p.z - rz)
      this.cachedBoxMax.set(p.x + rx, this.config.height, p.z + rz)
      this.cachedBox.set(this.cachedBoxMin, this.cachedBoxMax)
      this.boxDirty = false
    }
    return this.cachedBox
  }

  update(dt: number, controls: VehicleControls, collidables: Collidable[]): void {
    // --- throttle ---
    const speed = this.speed
    const maxSpeed = this.wrecked ? this.config.maxSpeed * 0.25 : this.config.maxSpeed

    if (controls.throttle > 0) {
      this.speed += this.config.acceleration * controls.throttle * dt
      if (this.speed > maxSpeed) this.speed = maxSpeed
    } else if (controls.throttle < 0) {
      if (speed > 0.5) {
        // braking
        this.speed -= this.config.brakeForce * dt
        if (this.speed < 0) this.speed = 0
      } else {
        // reversing
        this.speed += this.config.acceleration * 0.6 * controls.throttle * dt
        if (this.speed < -this.config.reverseMax) this.speed = -this.config.reverseMax
      }
    } else {
      // natural deceleration (racing pattern: friction per frame @ 60fps)
      this.speed *= Math.pow(this.config.friction, dt * 60)
      if (Math.abs(this.speed) < 0.05) this.speed = 0
    }

    // --- steering (only effective while moving) ---
    const steerEffect = MathUtils.clamp(Math.abs(speed) / 6, 0, 1)
    this.yaw += controls.steer * this.config.turnRate * Math.sign(speed) * steerEffect * dt

    this.integrate(dt, -controls.steer * this.config.rollFactor * steerEffect * Math.sign(speed))
    this.resolveCollisions(collidables)
    this.resolveWorldBounds()

    // --- damage from impacts ---
    const impact = this.lastCollided ? Math.abs(this.speed) : 0
    if (impact > IMPACT_DAMAGE_THRESHOLD) {
      const dmg = (impact - IMPACT_DAMAGE_THRESHOLD) * IMPACT_DAMAGE_SCALE
      this.takeDamage(dmg * dt * 60) // frame-rate independent-ish
    }
  }

  /**
   * AI driving (traffic): steer toward a target heading, accelerate toward a
   * target speed, then integrate + collide like a normal vehicle.
   */
  aiDrive(dt: number, targetYaw: number, targetSpeed: number, collidables: Collidable[]): void {
    if (this.wrecked) targetSpeed = 0
    // steer toward targetYaw
    let diff = targetYaw - this.yaw
    while (diff > Math.PI) diff -= Math.PI * 2
    while (diff < -Math.PI) diff += Math.PI * 2
    const maxTurn = this.config.turnRate * 0.7 * dt
    this.yaw += MathUtils.clamp(diff, -maxTurn, maxTurn)

    // accelerate toward target speed
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + this.config.acceleration * 0.8 * dt)
    } else {
      this.speed = Math.max(targetSpeed, this.speed - this.config.brakeForce * 0.8 * dt)
    }

    this.integrate(dt, 0)
    this.resolveCollisions(collidables)
    this.resolveWorldBounds()
  }

  /** Shared position/visual integration used by both player and AI driving. */
  private integrate(dt: number, rollTarget: number): void {
    this.position.x += Math.sin(this.yaw) * this.speed * dt
    this.position.z += Math.cos(this.yaw) * this.speed * dt

    this.group.rotation.y = this.yaw
    this.group.rotation.z = MathUtils.damp(this.group.rotation.z, rollTarget, 10, dt)
    for (const wheel of this.wheels) {
      wheel.rotation.x += (this.speed / this.config.wheelRadius) * dt
    }
    this.boxDirty = true
  }

  takeDamage(amount: number): void {
    if (this.wrecked) return
    this.health = Math.max(0, this.health - amount)
    if (this.health <= 0) {
      this.health = 0
      this.wrecked = true
      this.speed = 0
    }
  }

  repair(): void {
    this.health = this.config.maxHealth
    this.wrecked = false
  }

  // --- internals ---

  private buildBody(config: VehicleData): void {
    const w = config.width
    const h = config.height
    const l = config.length
    const bodyMat = new MeshStandardMaterial({ color: config.color, roughness: 0.35, metalness: 0.5 })
    const cabinMat = new MeshStandardMaterial({ color: config.cabinColor, roughness: 0.2, metalness: 0.6 })
    const wheelMat = new MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.95 })

    // main body
    const body = new Mesh(new BoxGeometry(w, h * 0.55, l), bodyMat)
    body.position.y = h * 0.32
    body.castShadow = true
    this.group.add(body)

    // cabin
    const cabin = new Mesh(new BoxGeometry(w * 0.86, h * 0.5, l * 0.5), cabinMat)
    cabin.position.set(0, h * 0.62, -l * 0.08)
    cabin.castShadow = true
    this.group.add(cabin)

    // bumpers
    const bumperMat = new MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.8 })
    const front = new Mesh(new BoxGeometry(w * 0.95, h * 0.18, 0.25), bumperMat)
    front.position.set(0, h * 0.28, l / 2)
    this.group.add(front)
    const rear = front.clone()
    rear.position.z = -l / 2
    this.group.add(rear)

    // wheels (4)
    const wheelGeo = new CylinderGeometry(config.wheelRadius, config.wheelRadius, 0.32, 14)
    const positions: Array<[number, number]> = [
      [w * 0.55, l * 0.32],
      [-w * 0.55, l * 0.32],
      [w * 0.55, -l * 0.32],
      [-w * 0.55, -l * 0.32],
    ]
    for (const [px, pz] of positions) {
      const wheel = new Mesh(wheelGeo, wheelMat)
      wheel.rotation.z = Math.PI / 2
      wheel.position.set(px, config.wheelRadius, pz)
      wheel.castShadow = true
      this.group.add(wheel)
      this.wheels.push(wheel)
    }

    // headlights
    const lightMat = new MeshStandardMaterial({ color: 0xfff7d1, emissive: 0xfff2b0, emissiveIntensity: 0.5 })
    for (const side of [-1, 1]) {
      const light = new Mesh(new BoxGeometry(0.3, 0.16, 0.06), lightMat)
      light.position.set(side * w * 0.32, h * 0.3, l / 2 + 0.05)
      this.group.add(light)
    }
  }

  /** Push-out collision vs building AABBs (rectangle vs rectangle on XZ). */
  private resolveCollisions(collidables: Collidable[]): void {
    let collided = false
    for (const { box } of collidables) {
      // vertical overlap check
      if (box.max.y < 0 || box.min.y > this.config.height) continue

      const p = this.group.position
      const hx = this.hitboxHalf.x
      const hz = this.hitboxHalf.z
      // use rotated-extent AABB for collision (conservative)
      const cos = Math.abs(Math.cos(this.yaw))
      const sin = Math.abs(Math.sin(this.yaw))
      const rx = hx * cos + hz * sin
      const rz = hx * sin + hz * cos

      const cx = MathUtils.clamp(p.x, box.min.x, box.max.x) - p.x
      const cz = MathUtils.clamp(p.z, box.min.z, box.max.z) - p.z
      const dx = rx - Math.abs(cx)
      const dz = rz - Math.abs(cz)
      if (dx < 0 || dz < 0) continue // no overlap on one axis

      // resolve along smallest penetration
      if (dx < dz) {
        p.x += cx > 0 ? -dx : dx
      } else {
        p.z += cz > 0 ? -dz : dz
      }

      // slow the vehicle on impact
      if (Math.abs(this.speed) > 2) this.speed *= 0.62
      collided = true
    }
    this.lastCollided = collided
  }

  private resolveWorldBounds(): void {
    const p = this.group.position
    if (Math.abs(p.x) > WORLD_HALF) {
      p.x = Math.sign(p.x) * WORLD_HALF
      this.speed *= 0.5
    }
    if (Math.abs(p.z) > WORLD_HALF) {
      p.z = Math.sign(p.z) * WORLD_HALF
      this.speed *= 0.5
    }
  }
}
