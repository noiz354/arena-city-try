/**
 * Shadow-texel snapping helpers (threejs-shadow-systems skill). Extracted as
 * pure functions so the stabilization math is unit-testable headlessly.
 */

/** World-space size of one shadow-map texel for a frustum half-extent + map size. */
export function worldTexelSize(halfExtent: number, mapSize: number): number {
  return (halfExtent * 2) / mapSize
}

/** Snap a world coordinate to a grid of `size` (round to nearest cell). */
export function snapToGrid(value: number, size: number): number {
  if (size <= 0) return value
  return Math.round(value / size) * size
}
