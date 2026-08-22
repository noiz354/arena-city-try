import { Vector3 } from 'three'

/**
 * Ray intersection helpers used by shooting (WeaponSystem), enemy vision
 * (EnemySystem), and the camera (CameraRig).
 */

/** Ray vs axis-aligned box (slab method). Returns entry t, or null if no hit within maxDist. */
export function rayAABB(
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
      if (o < mn || o > mx) return null
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

/** Ray vs sphere. Returns entry t along the ray, or null. */
export function raySphere(
  origin: Vector3,
  dir: Vector3,
  center: Vector3,
  radius: number,
  maxDist: number,
): number | null {
  const oc = center.clone().sub(origin)
  const b = oc.dot(dir)
  if (b < 0 || b > maxDist) return null
  const c = oc.dot(oc) - radius * radius
  const disc = b * b - c
  if (disc < 0) return null
  const t = b - Math.sqrt(disc)
  return t >= 0 && t <= maxDist ? t : null
}
