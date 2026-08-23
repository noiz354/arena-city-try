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

/**
 * Landmark tower. Placed at the center of the north-east central block (20,20)
 * — NOT at the origin — so it no longer blocks the central road intersection
 * where the player spawns and AI traffic passes. Previously it sat at (0,0)
 * and swallowed the intersection, wedging the player + starter cars and
 * deadlocking traffic on both center roads (see PLAYTEST_BUGS BUG-001/002).
 */
export const TOWER_X = 20
export const TOWER_Z = 20
export const TOWER_SIZE = 16
export const TOWER_HEIGHT = 72

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
  kind: 'streetlight' | 'tree' | 'bush' | 'hydrant' | 'bench' | 'rock'
  x: number
  z: number
  rot: number
}

export interface ChunkContent {
  buildings: BuildingSpec[]
  props: PropSpec[]
  /** ponytail: TypedArray SoA for instanced path — Float32Array per openworld-js DPZ, falls back to AoS */
  buildingData: Float32Array // [cx,cz,w,d,h]*N
  buildingColors: Uint32Array // [color]*N
  dirty: boolean
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

  // --- landmark: tower in the NE central block (clear of the center intersection) ---
  const towerCx = Math.floor((TOWER_X + CHUNK_GRID_HALF) / CHUNK_SIZE)
  const towerCz = Math.floor((TOWER_Z + CHUNK_GRID_HALF) / CHUNK_SIZE)
  if (cx === towerCx && cz === towerCz) {
    buildings.push({
      cx: TOWER_X,
      cz: TOWER_Z,
      w: TOWER_SIZE,
      d: TOWER_SIZE,
      h: TOWER_HEIGHT,
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

          // keep the tower footprint clear — checked per-plot (not per-chunk) so
          // plots in every chunk that overlaps the tower are skipped
          const towerClear = TOWER_SIZE / 2 + plotSize / 2
          if (Math.abs(plotCx - TOWER_X) < towerClear && Math.abs(plotCz - TOWER_Z) < towerClear) continue

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
          // fire hydrant on the opposite corner of some blocks
          if (pi === 1 && pj === 1 && rng() < 0.5) {
            props.push({ kind: 'hydrant', x: blockMinX + BLOCK_SIZE - 1, z: blockMinZ + BLOCK_SIZE - 1, rot: rng() * Math.PI * 2 })
          }
        }
      }

    }
  }

  // --- scatter once per chunk (ponytail: was inside bc/bz loop → 9x density, now 1x + minDist) ---
  // ponytail: O(n²) naive tooClose scan, spatial hash if >50 trees/chunk
  const tooClose = (x: number, z: number, min: number): boolean => {
    const m2 = min * min
    for (const p of props) if ((p.x - x) ** 2 + (p.z - z) ** 2 < m2) return true
    return false
  }

  // trees on sidewalk edge (leave road center for vehicles)
  const treeCount = 2 + Math.floor(rng() * 3) // 2-4 per chunk
  for (let t = 0, tries = 0; t < treeCount && tries < 30; tries++) {
    let tx = worldMinX + rng() * CHUNK_SIZE
    let tz = worldMinZ + rng() * CHUNK_SIZE
    if (!inRoad(tx, tz)) continue
    // snap to 1-2.5m sidewalk strip next to block
    const bx = Math.floor((tx + CITY_HALF) / CELL)
    const bz = Math.floor((tz + CITY_HALF) / CELL)
    const lx = tx + CITY_HALF - bx * CELL
    const lz = tz + CITY_HALF - bz * CELL
    if (lx >= BLOCK_SIZE && lz >= BLOCK_SIZE) {
      if (rng() < 0.5) tx = bx * CELL - CITY_HALF + BLOCK_SIZE + 1 + rng() * 1.5
      else tz = bz * CELL - CITY_HALF + BLOCK_SIZE + 1 + rng() * 1.5
    } else if (lx >= BLOCK_SIZE) tx = bx * CELL - CITY_HALF + BLOCK_SIZE + 1 + rng() * 1.5
    else tz = bz * CELL - CITY_HALF + BLOCK_SIZE + 1 + rng() * 1.5
    if (tooClose(tx, tz, 5)) continue
    props.push({ kind: 'tree', x: tx, z: tz, rot: rng() * Math.PI * 2 })
    t++
  }

  // bushes inside blocks (keep per-chunk to normalize frontier x9)
  const bushCount = 2 + Math.floor(rng() * 2)
  for (let b = 0, tries = 0; b < bushCount && tries < 20; tries++) {
    const tx = worldMinX + rng() * CHUNK_SIZE
    const tz = worldMinZ + rng() * CHUNK_SIZE
    if (inRoad(tx, tz) || tooClose(tx, tz, 3)) continue
    props.push({ kind: 'bush', x: tx, z: tz, rot: rng() * Math.PI * 2 })
    b++
  }

  if (rng() < 0.35) {
    const tx = worldMinX + rng() * CHUNK_SIZE
    const tz = worldMinZ + rng() * CHUNK_SIZE
    if (!inRoad(tx, tz) && !tooClose(tx, tz, 3)) props.push({ kind: 'rock', x: tx, z: tz, rot: rng() * Math.PI * 2 })
  }

  if (rng() < 0.25) {
    const tx = worldMinX + rng() * CHUNK_SIZE
    const tz = worldMinZ + rng() * CHUNK_SIZE
    if (inRoad(tx, tz) && !tooClose(tx, tz, 4)) props.push({ kind: 'bench', x: tx, z: tz, rot: rng() * Math.PI * 2 })
  }

  // ponytail: TypedArray pack for B1 — single alloc SoA mirrors openworld-js positionsStatus
  const N = buildings.length
  const buildingData = new Float32Array(N * 5)
  const buildingColors = new Uint32Array(N)
  for (let i = 0; i < N; i++) {
    const b = buildings[i]
    buildingData[i * 5 + 0] = b.cx
    buildingData[i * 5 + 1] = b.cz
    buildingData[i * 5 + 2] = b.w
    buildingData[i * 5 + 3] = b.d
    buildingData[i * 5 + 4] = b.h
    buildingColors[i] = b.color >>> 0
  }
  return { buildings, props, buildingData, buildingColors, dirty: true }
}
