import { MathUtils } from 'three'

// --- city layout constants (all in meters) ---
export const BLOCK_SIZE = 30 // building block edge length
export const ROAD_WIDTH = 10
export const CELL = BLOCK_SIZE + ROAD_WIDTH // 40
export const BLOCK_COUNT = 8 // blocks per axis → city ~310m
export const CITY_SIZE = BLOCK_COUNT * BLOCK_SIZE + (BLOCK_COUNT - 1) * ROAD_WIDTH // 310
export const CITY_HALF = CITY_SIZE / 2 // 155
export const CHUNK_SIZE = 16
export const CHUNK_COUNT = Math.ceil(CITY_SIZE / CHUNK_SIZE) + 2 // 20 + margin chunks
export const CHUNK_GRID_HALF = (CHUNK_COUNT * CHUNK_SIZE) / 2 // 176
export const CHUNK_CENTER = Math.floor(CHUNK_GRID_HALF / CHUNK_SIZE) // center chunk index

/** Road center lines per axis (between blocks). */
export const ROADS_X: number[] = Array.from({ length: BLOCK_COUNT - 1 }, (_, i) =>
  i * CELL - CITY_HALF + BLOCK_SIZE + ROAD_WIDTH / 2,
)
export const ROADS_Z: number[] = [...ROADS_X]

/** Deterministic PRNG (mulberry32) so chunk content is stable across activations. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function chunkSeed(cx: number, cz: number): number {
  // hash 2D coords into a single seed
  let h = cx * 374761393 + cz * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return (h ^ (h >> 16)) >>> 0
}

export interface BuildingSpec {
  cx: number // center
  cz: number
  w: number
  d: number
  h: number
  color: number
}

export interface PropSpec {
  kind: 'streetlight' | 'tree'
  x: number
  z: number
  rot: number
}

export interface ChunkContent {
  buildings: BuildingSpec[]
  props: PropSpec[]
}

/** True when the block plot at world (x,z) belongs to a road (not a block). */
function inRoad(x: number, z: number): boolean {
  const bx = Math.floor((x + CITY_HALF) / CELL)
  const bz = Math.floor((z + CITY_HALF) / CELL)
  const localX = (x + CITY_HALF) - bx * CELL
  const localZ = (z + CITY_HALF) - bz * CELL
  return localX >= BLOCK_SIZE || localZ >= BLOCK_SIZE
}

/**
 * Procedural city generator. Generates the content of one chunk using a
 * deterministic RNG seeded by chunk coordinates — the same chunk always
 * produces the same buildings, so activate/deactivate cycles are stable.
 *
 * Buildings are assigned to the chunk containing their center. Blocks are
 * split into 2x2 plots; each plot may hold a building (70%).
 */
export function generateChunk(cx: number, cz: number): ChunkContent {
  const rng = seededRng(chunkSeed(cx, cz))
  const buildings: BuildingSpec[] = []
  const props: PropSpec[] = []

  const worldMinX = cx * CHUNK_SIZE - CHUNK_GRID_HALF
  const worldMinZ = cz * CHUNK_SIZE - CHUNK_GRID_HALF

  const palette = [0x8fa3b8, 0xb5c4d4, 0xc9b58f, 0xa8b8a0, 0xcfd8e3, 0x9b8aa6, 0x7d9aad]

  // --- landmark: central tower at the city center (chunk containing world 0,0) ---
  const isCenterChunk = cx === CHUNK_CENTER && cz === CHUNK_CENTER
  if (isCenterChunk) {
    buildings.push({
      cx: 0,
      cz: 0,
      w: 16,
      d: 16,
      h: 72,
      color: 0x5d7a9e,
    })
  }

  // --- buildings: check the 4 block plots that can intersect this chunk ---
  for (let bc = -1; bc <= 1; bc++) {
    for (let bz = -1; bz <= 1; bz++) {
      // block index in city grid
      const gi = Math.floor((worldMinX + CHUNK_SIZE / 2 + CITY_HALF) / CELL) + bc
      const gj = Math.floor((worldMinZ + CHUNK_SIZE / 2 + CITY_HALF) / CELL) + bz
      if (gi < 0 || gj < 0 || gi >= BLOCK_COUNT || gj >= BLOCK_COUNT) continue

      // block footprint
      const blockMinX = gi * CELL - CITY_HALF
      const blockMinZ = gj * CELL - CITY_HALF

      // 2x2 plots inside the block (1m gaps, 1m margin to roads)
      const plotSize = (BLOCK_SIZE - 3) / 2 // ~13.5
      for (let pi = 0; pi < 2; pi++) {
        for (let pj = 0; pj < 2; pj++) {
          const plotCx = blockMinX + 1.5 + plotSize * (pi + 0.5)
          const plotCz = blockMinZ + 1.5 + plotSize * (pj + 0.5)

          // only generate the plot if its center is inside this chunk
          if (plotCx < worldMinX || plotCx >= worldMinX + CHUNK_SIZE) continue
          if (plotCz < worldMinZ || plotCz >= worldMinZ + CHUNK_SIZE) continue

          // keep the central tower footprint clear
          if (isCenterChunk && Math.abs(plotCx) < 14 && Math.abs(plotCz) < 14) continue

          if (rng() < 0.7) {
            buildings.push({
              cx: plotCx,
              cz: plotCz,
              w: MathUtils.lerp(plotSize * 0.75, plotSize * 0.95, rng()),
              d: MathUtils.lerp(plotSize * 0.75, plotSize * 0.95, rng()),
              h: Math.floor(MathUtils.lerp(8, 40, rng() ** 1.6) / 3) * 3 + 6,
              color: palette[Math.floor(rng() * palette.length)],
            })
          }

          // streetlight at the block corner nearest the plot (block corners)
          if (pi === 0 && pj === 0) {
            props.push({ kind: 'streetlight', x: blockMinX + 1, z: blockMinZ + 1, rot: rng() * Math.PI * 2 })
          }
        }
      }

      // a few trees along the road at random spots within this chunk
      const treeCount = Math.floor(rng() * 3)
      for (let t = 0; t < treeCount; t++) {
        const tx = worldMinX + rng() * CHUNK_SIZE
        const tz = worldMinZ + rng() * CHUNK_SIZE
        if (!inRoad(tx, tz)) continue
        props.push({ kind: 'tree', x: tx, z: tz, rot: rng() * Math.PI * 2 })
      }
    }
  }

  return { buildings, props }
}
