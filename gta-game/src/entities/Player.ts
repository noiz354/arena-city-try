import {
  CapsuleGeometry,
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from 'three'
import type { InputManager } from '../utils/InputManager'
import type { Collidable } from '../game/World'

const GRAVITY = 26 // m/s^2, slightly snappy for game feel
const JUMP_SPEED = 9.2
const WALK_SPEED = 5.5 // m/s
const SPRINT_SPEED = 9.5
const ACCEL_GROUND = 10 // per second — inertia approach (Edelweiss pattern)
const ACCEL_AIR = 2.5
const HALF_HEIGHT = 0.95 // capsule half-height (feet = y - HALF_HEIGHT)
const RADIUS = 0.45
const MAX_FALL = -28
const WORLD_HALF = 49 // clamp inside the 100x100 world

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

  private readonly body: Mesh
  private readonly tmpV = new Vector3()
  private readonly tmpV2 = new Vector3()
  private readonly tmpV3 = new Vector3()

  constructor() {
    // Procedural capsule body (no GLTF asset needed in sandbox)
    const geo = new CapsuleGeometry(RADIUS, 1.0, 6, 14)
    const mat = new MeshStandardMaterial({
      color: 0x2e86de,
      roughness: 0.6,
      metalness: 0.15,
    })
    this.body = new Mesh(geo, mat)
    this.body.castShadow = true
    this.body.position.y = HALF_HEIGHT
    this.group.add(this.body)

    // face indicator so yaw rotation is visible
    const noseGeo = new CapsuleGeometry(0.08, 0.35, 4, 8)
    const noseMat = new MeshStandardMaterial({ color: new Color(0xffd166), roughness: 0.4 })
    const nose = new Mesh(noseGeo, noseMat)
    nose.rotation.x = Math.PI / 2
    nose.position.set(0, HALF_HEIGHT * 0.9, RADIUS + 0.2)
    this.body.add(nose)

    this.group.position.set(0, 0, 0)
    this.group.rotation.order = 'YXZ'
  }

  get position(): Vector3 {
    return this.group.position
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
