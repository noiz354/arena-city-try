import {
  BoxGeometry,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  Vector3,
} from 'three'
import type { InputManager } from '../utils/InputManager'
import type { Collidable } from '../game/World'
import { CITY_HALF } from '../systems/CityGenerator'

const GRAVITY = 26 // m/s^2, slightly snappy for game feel
const JUMP_SPEED = 9.2
const WALK_SPEED = 5.5 // m/s
const SPRINT_SPEED = 9.5
const ACCEL_GROUND = 10 // per second — inertia approach (Edelweiss pattern)
const ACCEL_AIR = 2.5
const HALF_HEIGHT = 0.95 // capsule half-height (feet = y - HALF_HEIGHT)
const RADIUS = 0.45
const MAX_FALL = -28
const WORLD_HALF = CITY_HALF - 3 // clamp inside the city bounds

const SPRINT_DRAIN = 22 // stamina/sec
const STAMINA_REGEN = 14 // stamina/sec (grounded, not sprinting)
const STAMINA_MAX = 100

/**
 * Third-person player controller: WASD with inertia, mouse-look yaw, gravity,
 * jump, sprint with stamina, and AABB push-out collision (patterns adapted from
 * Edelweiss controler.js + racing vehicle physics).
 */
export class Player {
  readonly group = new Group()
  readonly velocity = new Vector3()

  yaw = 0
  grounded = true
  stamina = STAMINA_MAX
  maxHealth = 100
  health = 100

  private readonly body: Group
  private readonly tmpV = new Vector3()
  private readonly tmpV2 = new Vector3()
  private readonly tmpV3 = new Vector3()

  constructor() {
    // Procedural humanoid model (no GLTF asset needed in sandbox): a rigged
    // set of primitives — legs, shoes, torso/jacket, arms, head + hair — that
    // reads as a character instead of a bare placeholder capsule.
    this.body = this.buildHumanoid()
    this.group.add(this.body)

    this.group.position.set(0, 0, 0)
    this.group.rotation.order = 'YXZ'
  }

  /** Build a ~1.9m humanoid from box/sphere primitives (feet at local y=0). */
  private buildHumanoid(): Group {
    const body = new Group()
    body.name = 'player-model'

    const jacket = new MeshStandardMaterial({ color: 0x2e86de, roughness: 0.55, metalness: 0.1 })
    const jacketDark = new MeshStandardMaterial({ color: 0x274f8f, roughness: 0.6 })
    const pants = new MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.85 })
    const skin = new MeshStandardMaterial({ color: 0xe8b98a, roughness: 0.7 })
    const shoe = new MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.7 })
    const hair = new MeshStandardMaterial({ color: 0x2a2320, roughness: 0.9 })

    const add = (mesh: Mesh, x: number, y: number, z: number): Mesh => {
      mesh.position.set(x, y, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      body.add(mesh)
      return mesh
    }

    // legs + shoes
    add(new Mesh(new BoxGeometry(0.22, 0.82, 0.24), pants), -0.15, 0.41, 0)
    add(new Mesh(new BoxGeometry(0.22, 0.82, 0.24), pants), 0.15, 0.41, 0)
    add(new Mesh(new BoxGeometry(0.24, 0.12, 0.34), shoe), -0.15, 0.06, 0.06)
    add(new Mesh(new BoxGeometry(0.24, 0.12, 0.34), shoe), 0.15, 0.06, 0.06)

    // torso / jacket
    add(new Mesh(new BoxGeometry(0.52, 0.62, 0.3), jacket), 0, 1.13, 0)

    // arms + hands
    add(new Mesh(new BoxGeometry(0.14, 0.58, 0.14), jacketDark), -0.36, 1.12, 0)
    add(new Mesh(new BoxGeometry(0.14, 0.58, 0.14), jacketDark), 0.36, 1.12, 0)
    add(new Mesh(new BoxGeometry(0.12, 0.12, 0.12), skin), -0.36, 0.86, 0)
    add(new Mesh(new BoxGeometry(0.12, 0.12, 0.12), skin), 0.36, 0.86, 0)

    // head + hair cap
    const head = add(new Mesh(new SphereGeometry(0.2, 16, 12), skin), 0, 1.62, 0)
    const cap = new Mesh(new SphereGeometry(0.21, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), hair)
    cap.position.set(0, 0.04, 0)
    cap.castShadow = true
    head.add(cap)

    // nose/face indicator so yaw rotation is visible (three.js forward is -Z)
    add(new Mesh(new SphereGeometry(0.05, 8, 8), skin), 0, 1.62, -0.19)

    return body
  }

  get position(): Vector3 {
    return this.group.position
  }

  takeDamage(amount: number): boolean {
    if (this.health <= 0) return false
    this.health = Math.max(0, this.health - amount)
    return this.health <= 0
  }

  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount)
  }

  respawnAt(x: number, z: number): void {
    this.health = this.maxHealth
    this.stamina = STAMINA_MAX
    this.velocity.set(0, 0, 0)
    this.group.position.set(x, 0.95, z)
    this.group.visible = true
  }

  update(dt: number, input: InputManager, cameraYaw: number, collidables: Collidable[]): void {
    // --- steering: camera-relative WASD ---
    const forward = this.tmpV.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw))
    const right = this.tmpV2.crossVectors(forward, Vector3_UP).normalize()

    const moveX = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0)
    const moveZ = (input.isDown('KeyS') ? 1 : 0) - (input.isDown('KeyW') ? 1 : 0)

    const dir = this.tmpV3
      .set(0, 0, 0)
      .addScaledVector(forward, moveZ)
      .addScaledVector(right, moveX)
    const hasInput = dir.lengthSq() > 0
    if (hasInput) dir.normalize()

    // face the camera yaw (GTA-style: character turns with camera)
    this.yaw = MathUtils.damp(this.yaw, cameraYaw, 8, dt)
    this.group.rotation.y = this.yaw

    // --- sprint + stamina ---
    const wantSprint = input.isDown('ShiftLeft', 'ShiftRight') && hasInput
    const canSprint = wantSprint && this.stamina > 0.01
    const speed = canSprint ? SPRINT_SPEED : WALK_SPEED

    if (canSprint) {
      this.stamina = Math.max(0, this.stamina - SPRINT_DRAIN * dt)
    } else if (this.grounded && !wantSprint) {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + STAMINA_REGEN * dt)
    }

    // --- horizontal inertia (Edelweiss pattern) ---
    const targetVX = dir.x * speed
    const targetVZ = dir.z * speed
    const accel = this.grounded ? ACCEL_GROUND : ACCEL_AIR
    const k = 1 - Math.exp(-accel * dt)
    this.velocity.x += (targetVX - this.velocity.x) * k
    this.velocity.z += (targetVZ - this.velocity.z) * k

    // --- gravity + jump ---
    this.velocity.y -= GRAVITY * dt
    if (this.velocity.y < MAX_FALL) this.velocity.y = MAX_FALL

    if (input.wasPressed('Space') && this.grounded) {
      this.velocity.y = JUMP_SPEED
      this.grounded = false
    }

    // --- integrate ---
    this.position.x += this.velocity.x * dt
    this.position.y += this.velocity.y * dt
    this.position.z += this.velocity.z * dt

    this.resolveGround(collidables)
    this.resolveCollisions(collidables)

    // world bounds
    this.position.x = MathUtils.clamp(this.position.x, -WORLD_HALF, WORLD_HALF)
    this.position.z = MathUtils.clamp(this.position.z, -WORLD_HALF, WORLD_HALF)
  }

  /** Find ground height under the player using AABB top faces + flat floor (y=0). */
  private resolveGround(collidables: Collidable[]): void {
    let groundY = 0
    for (const { box } of collidables) {
      if (this.position.x < box.min.x || this.position.x > box.max.x) continue
      if (this.position.z < box.min.z || this.position.z > box.max.z) continue
      // roof counts only if it is at/below the player's feet reach
      if (box.max.y > groundY && box.max.y <= this.position.y + 0.4) {
        groundY = box.max.y
      }
    }

    if (this.position.y <= groundY + HALF_HEIGHT + 0.01) {
      this.grounded = true
      if (this.velocity.y <= 0) {
        this.position.y = groundY + HALF_HEIGHT
        this.velocity.y = 0
      }
    } else {
      this.grounded = false
    }
  }

  /** AABB push-out collision on the XZ plane (2D closest-point resolution). */
  private resolveCollisions(collidables: Collidable[]): void {
    for (const { box } of collidables) {
      const minY = this.position.y - HALF_HEIGHT
      const maxY = this.position.y + HALF_HEIGHT
      if (box.max.y < minY || box.min.y > maxY) continue // no vertical overlap

      // closest point on the box footprint to the player center (XZ)
      const cx = MathUtils.clamp(this.position.x, box.min.x, box.max.x) - this.position.x
      const cz = MathUtils.clamp(this.position.z, box.min.z, box.max.z) - this.position.z
      const d2 = cx * cx + cz * cz
      if (d2 >= RADIUS * RADIUS) continue

      if (d2 > 1e-9) {
        const d = Math.sqrt(d2)
        const push = RADIUS - d
        this.position.x += (cx / d) * push
        this.position.z += (cz / d) * push
      } else {
        // center inside footprint: push along smallest penetration axis
        const penX = Math.min(this.position.x - box.min.x, box.max.x - this.position.x)
        const penZ = Math.min(this.position.z - box.min.z, box.max.z - this.position.z)
        if (penX < penZ) {
          this.position.x += this.position.x < (box.min.x + box.max.x) / 2 ? -(penX + RADIUS) : penX + RADIUS
        } else {
          this.position.z += this.position.z < (box.min.z + box.max.z) / 2 ? -(penZ + RADIUS) : penZ + RADIUS
        }
      }
    }
  }
}

const Vector3_UP = new Vector3(0, 1, 0)
