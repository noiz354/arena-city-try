import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { InputManager } from '../utils/InputManager'
import type { Collidable } from '../game/World'

const MIN_DISTANCE = 2.5
const MAX_DISTANCE = 20
const START_DISTANCE = 9
const LOOK_HEIGHT = 1.4 // look at chest height
const MOUSE_SENSITIVITY = 0.0035
const PITCH_LIMIT = 0.55 // radians above horizon (~31.5 deg)
const WALL_MARGIN = 0.35 // keep camera this far from obstacles

/**
 * Third-person chase camera with wall avoidance — adapted from Edelweiss
 * CameraControl.js and 3d-game camera.js: spherical offset behind the target,
 * obstacle ray (ray-vs-AABB slab test) shortens the distance, smooth damp.
 *
 * Yaw model: the user's mouse contributes a persistent offset (`mouseYaw`).
 *   - On foot:      yaw = mouseYaw
 *   - Driving:      yaw = vehicle heading + mouseYaw  (GTA-style follow)
 */
export class CameraRig {
  yaw = Math.PI * 0.35
  pitch = 0.3
  followYaw: number | null = null

  private mouseYaw = this.yaw
  private distance = START_DISTANCE
  private targetDistance = START_DISTANCE

  private readonly dirToCamera = new Vector3()
  private readonly origin = new Vector3()
  private readonly desired = new Vector3()

  constructor(readonly camera: PerspectiveCamera) {}

  /** Entering a vehicle: snap the camera behind the car, reset mouse offset. */
  onEnterVehicle(vehicleYaw: number): void {
    this.followYaw = vehicleYaw
    this.mouseYaw = 0
    this.yaw = vehicleYaw
    this.distance = MathUtils.clamp(this.distance, MIN_DISTANCE + 2, MAX_DISTANCE)
  }

  /** Back to on-foot free orbit (keep the current view heading). */
  onExitVehicle(): void {
    this.followYaw = null
  }

  update(dt: number, input: InputManager, targetPos: Vector3, collidables: Collidable[]): void {
    // --- orbit with mouse drag ---
    this.mouseYaw -= input.mouseDelta.x * MOUSE_SENSITIVITY
    this.pitch = MathUtils.clamp(this.pitch + input.mouseDelta.y * MOUSE_SENSITIVITY, 0.05, PITCH_LIMIT)
    this.yaw = this.followYaw === null ? this.mouseYaw : this.followYaw + this.mouseYaw

    // --- scroll zoom ---
    if (input.wheelDelta !== 0) {
      this.targetDistance = MathUtils.clamp(
        this.targetDistance + input.wheelDelta * 0.008,
        MIN_DISTANCE,
        MAX_DISTANCE,
      )
    }
    this.distance = MathUtils.damp(this.distance, this.targetDistance, 6, dt)

    // --- desired camera position (spherical offset) ---
    const cp = Math.cos(this.pitch)
    this.dirToCamera.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp)
    this.desired.copy(targetPos).addScaledVector(this.dirToCamera, this.distance)

    // --- wall avoidance: ray from target head toward desired camera spot ---
    this.origin.copy(targetPos)
    this.origin.y += LOOK_HEIGHT
    let finalDist = this.distance
    for (const { box } of collidables) {
      const hitT = rayAABB(this.origin, this.dirToCamera, box.min, box.max, this.distance + WALL_MARGIN)
      if (hitT !== null && hitT < finalDist - 0.05) {
        finalDist = Math.max(hitT - WALL_MARGIN, MIN_DISTANCE)
      }
    }

    // --- place camera ---
    this.camera.position.copy(this.origin).addScaledVector(this.dirToCamera, finalDist)
    this.camera.lookAt(targetPos.x, targetPos.y + LOOK_HEIGHT, targetPos.z)
  }
}

/**
 * Ray vs axis-aligned box (slab method). Returns the entry distance t along
 * the ray, or null if no hit within maxDist.
 */
function rayAABB(
  origin: Vector3,
  dir: Vector3,
  boxMin: Vector3,
  boxMax: Vector3,
  maxDist: number,
): number | null {
  let tmin = 0
  let tmax = maxDist
  for (let a = 0; a < 3; a++) {
    const o = origin.getComponent(a)
    const d = dir.getComponent(a)
    const mn = boxMin.getComponent(a)
    const mx = boxMax.getComponent(a)
    if (Math.abs(d) < 1e-9) {
      if (o < mn || o > mx) return null // parallel and outside
    } else {
      let t1 = (mn - o) / d
      let t2 = (mx - o) / d
      if (t1 > t2) [t1, t2] = [t2, t1]
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return null
    }
  }
  return tmin
}
