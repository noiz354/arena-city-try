import { CatmullRomCurve3, Vector3 } from 'three'

// Racing Track.ts pattern: CatmullRom + baked pathVectors (CPU follows t)
// ponytail: 100 pts baked, no extrusion; upgrade to Track.createCatmullRom if visual mesh needed
export function createPath(points: Vector3[], closed = true, divisions = 100): { pathPoints: Vector3[]; pathVectors: Vector3[] } {
  const curve = new CatmullRomCurve3(points, closed)
  const baked = curve.getPoints(divisions)
  const pathPoints: Vector3[] = []
  const pathVectors: Vector3[] = []
  for (let i = 0; i < divisions - 1; i++) {
    const p1 = baked[i].clone(); const p2 = baked[i+1].clone()
    pathPoints.push(p1)
    pathVectors.push(p2.sub(p1).normalize())
  }
  return { pathPoints, pathVectors }
}
let idx = 0
export function nextPointIndex(pos: Vector3, pathPoints: Vector3[], start = idx): number {
  let best = start % pathPoints.length
  let bestD = Infinity
  const n = pathPoints.length
  for (let i = start; i < n; i++) {
    const d = pos.distanceToSquared(pathPoints[i])
    if (d < bestD) { bestD = d; best = i }
  }
  idx = best
  return best
}
