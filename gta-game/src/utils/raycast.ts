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

/**
 * Ray vs vertical capsule approximated by sampling N spheres along the axis.
 * `feet` is the bottom of the capsule, `height` its total height, `radius` its
 * width. Deterministic and robust — the 4 samples cover feet, hips, chest and
 * head, so shots aimed at the chest connect with the body.
 */
export function rayCapsule(
  origin: Vector3,
  dir: Vector3,
  feet: Vector3,
  radius: number,
  height: number,
  maxDist: number,
): number | null {
  // sample 4 points along the axis (0 = feet … 1 = top of head)
  const SAMPLES = [0.08, 0.38, 0.68, 0.95]
  let best: number | null = null
  const p = new Vector3()
  const r = radius * 1.15 // slight inflation for the gaps between samples
  for (const s of SAMPLES) {
    p.copy(feet)
    p.y += height * s
    const t = raySphere(origin, dir, p, r, maxDist)
    if (t !== null && (best === null || t < best)) best = t
  }
  return best
}

/** Standard humanoid hit capsule (feet-based). */
export function rayHuman(
  origin: Vector3,
  dir: Vector3,
  feet: Vector3,
  maxDist: number,
): number | null {
  return rayCapsule(origin, dir, feet, 0.4, 1.75, maxDist)
}
