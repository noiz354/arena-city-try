import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  RepeatWrapping,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from 'three'
import {
  CHUNK_COUNT,
  CHUNK_GRID_HALF,
  CHUNK_SIZE,
  generateChunk,
  type BuildingSpec,
  type PropSpec,
} from './CityGenerator'
import type { Collidable } from '../game/World'

// LOD rings (Chebyshev distance in chunks from the player's chunk):
//   d <= 1  → level 2: full detail (windows texture + props + collidable)
//   d == 2  → level 1: simple (plain material, no props, still collidable)
//   d >  2  → level 0: hidden, memory disposed
const FULL_RADIUS = 1
const SIMPLE_RADIUS = 2

interface Chunk {
  key: string
  cx: number
  cz: number
  group: Group
  level: number
  collidables: Collidable[]
  /** per-building materials: [full, simple] */
  materials: MeshStandardMaterial[][]
  props: Group
}

const boxCenterTmp = new Vector3() // scratch for getCenter without allocation

/** Shared window-pattern texture (one instance reused by all full-detail buildings). */
let sharedWindowTexture: CanvasTexture | null = null

function windowTexture(): CanvasTexture {
  if (sharedWindowTexture) return sharedWindowTexture
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#3a3f47'
  ctx.fillRect(0, 0, size, size)
  // 4x4 window grid, most windows lit with a warm tone
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const x = col * 64 + 10
      const y = row * 64 + 10
      const lit = Math.random() > 0.35
      ctx.fillStyle = lit ? 'rgba(255, 214, 130, 0.95)' : 'rgba(120, 140, 165, 0.9)'
      ctx.fillRect(x, y, 44, 44)
      ctx.strokeStyle = '#2c2f36'
      ctx.lineWidth = 3
      ctx.strokeRect(x, y, 44, 44)
    }
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  sharedWindowTexture = tex
  return tex
}

/**
 * Spatial-hash chunk manager (openworld-js DPZ pattern, simplified):
 * - O(1) chunk lookup via Map keyed by "cx_cz"
 * - 3 detail levels by distance ring
 * - builds/disposes chunk meshes on activate/deactivate (memory cleanup)
 */
export class ChunkManager {
  readonly root = new Group()
  private readonly chunks = new Map<string, Chunk>()
  private activeCollidables: Collidable[] = []
  /** Static building collidables indexed by chunk cell (rebuilt on activation change). */
  private readonly grid = new Map<string, Collidable[]>()

  constructor() {
    for (let cx = 0; cx < CHUNK_COUNT; cx++) {
      for (let cz = 0; cz < CHUNK_COUNT; cz++) {
        const group = new Group()
        group.visible = false
        this.root.add(group)
        this.chunks.set(this.key(cx, cz), {
          key: this.key(cx, cz),
          cx,
          cz,
          group,
          level: 0,
          collidables: [],
          materials: [],
          props: new Group(),
        })
      }
    }
  }

  /** World position of the chunk grid corner of chunk (cx,cz). */
  chunkWorldX(cx: number): number {
    return cx * CHUNK_SIZE - CHUNK_GRID_HALF
  }

  chunkWorldZ(cz: number): number {
    return cz * CHUNK_SIZE - CHUNK_GRID_HALF
  }

  /** Player world position → chunk coordinates. */
  worldToChunk(x: number, z: number): { cx: number; cz: number } {
    return {
      cx: Math.floor((x + CHUNK_GRID_HALF) / CHUNK_SIZE),
      cz: Math.floor((z + CHUNK_GRID_HALF) / CHUNK_SIZE),
    }
  }

  /** Recompute activation rings around the player; returns true if anything changed. */
  update(playerX: number, playerZ: number): boolean {
    const { cx, cz } = this.worldToChunk(playerX, playerZ)
    let changed = false

    for (const chunk of this.chunks.values()) {
      const d = Math.max(Math.abs(chunk.cx - cx), Math.abs(chunk.cz - cz))
      const target = d <= FULL_RADIUS ? 2 : d <= SIMPLE_RADIUS ? 1 : 0
      if (chunk.level !== target) {
        chunk.level = target
        this.applyLevel(chunk, target)
        changed = true
      }
    }

    if (changed) this.rebuildActiveCollidables()
    return changed
  }

  /** Number of chunks currently visible (level > 0) — for the debug HUD. */
  get activeCount(): number {
    let n = 0
    for (const c of this.chunks.values()) if (c.level > 0) n++
    return n
  }

  getActiveCollidables(): Collidable[] {
    return this.activeCollidables
  }

  /**
   * Spatial query over the static building collidables (zero allocation):
   * visits every collidable whose chunk cell overlaps the circle around (x,z).
   * Used by enemy line-of-sight instead of scanning the full active list.
   */
  forEachNear(x: number, z: number, radius: number, cb: (c: Collidable) => void): void {
    const r = Math.ceil(radius / CHUNK_SIZE)
    const { cx, cz } = this.worldToChunk(x, z)
    for (let dx = -r; dx <= r; dx++) {
      for (let dz = -r; dz <= r; dz++) {
        const list = this.grid.get(`${cx + dx}_${cz + dz}`)
        if (list) for (const c of list) cb(c)
      }
    }
  }

  /** Same as forEachNear but collects into an array (one alloc per call). */
  queryCircle(x: number, z: number, radius: number): Collidable[] {
    const out: Collidable[] = []
    this.forEachNear(x, z, radius, c => out.push(c))
    return out
  }

  dispose(): void {
    for (const chunk of this.chunks.values()) this.disposeChunk(chunk)
    sharedWindowTexture?.dispose()
    sharedWindowTexture = null
  }

  // --- internals ---

  private key(cx: number, cz: number): string {
    return `${cx}_${cz}`
  }

  private applyLevel(chunk: Chunk, level: number): void {
    if (level === 2) {
      if (chunk.group.children.length === 0) this.buildFull(chunk)
      this.setMaterials(chunk, 0)
      chunk.props.visible = true
      chunk.group.visible = true
    } else if (level === 1) {
      if (chunk.group.children.length === 0) this.buildFull(chunk)
      this.setMaterials(chunk, 1)
      chunk.props.visible = false
      chunk.group.visible = true
    } else {
      chunk.group.visible = false
      chunk.props.visible = false
    }
  }

  private buildFull(chunk: Chunk): void {
    const content = generateChunk(chunk.cx, chunk.cz)
    const originX = this.chunkWorldX(chunk.cx)
    const originZ = this.chunkWorldZ(chunk.cz)

    for (const spec of content.buildings) {
      this.buildBuilding(chunk, spec, originX, originZ)
    }

    chunk.props = new Group()
    if (content.props.length > 0) {
      const mats = makePropMaterials()
      for (const prop of content.props) {
        this.buildProp(chunk, prop, originX, originZ, mats)
      }
    }
    chunk.group.add(chunk.props)
    chunk.group.visible = true
  }

  private buildBuilding(chunk: Chunk, spec: BuildingSpec, originX: number, originZ: number): void {
    const geometry = new BoxGeometry(spec.w, spec.h, spec.d)

    const windowTex = windowTexture().clone()
    windowTex.needsUpdate = true
    windowTex.repeat.set(Math.max(1, Math.round(spec.w / 4)), Math.max(1, Math.round(spec.h / 3)))

    const fullMat = new MeshStandardMaterial({
      color: spec.color,
      map: windowTex,
      roughness: 0.75,
      metalness: 0.05,
    })
    const simpleMat = new MeshStandardMaterial({ color: spec.color, roughness: 0.85 })

    const mesh = new Mesh(geometry, fullMat)
    mesh.position.set(spec.cx - originX, spec.h / 2, spec.cz - originZ)
    mesh.castShadow = true
    mesh.receiveShadow = true
    chunk.group.add(mesh)
    chunk.materials.push([fullMat, simpleMat])

    chunk.collidables.push({
      box: new Box3(
        new Vector3(spec.cx - spec.w / 2, 0, spec.cz - spec.d / 2),
        new Vector3(spec.cx + spec.w / 2, spec.h, spec.cz + spec.d / 2),
      ),
    })
  }

  private buildProp(
    chunk: Chunk,
    prop: PropSpec,
    originX: number,
    originZ: number,
    mats: PropMaterials,
  ): void {
    const x = prop.x - originX
    const z = prop.z - originZ

    if (prop.kind === 'streetlight') {
      const pole = new Mesh(new CylinderGeometry(0.12, 0.18, 6, 8), mats.trunk)
      pole.position.set(x, 3, z)
      const head = new Mesh(new SphereGeometry(0.35, 10, 8), mats.lamp)
      head.position.set(x, 6.2, z)
      chunk.props.add(pole, head)
    } else if (prop.kind === 'tree') {
      const trunk = new Mesh(new CylinderGeometry(0.25, 0.4, 3.2, 8), mats.trunk)
      trunk.position.set(x, 1.6, z)
      const foliage = new Mesh(new IcosahedronGeometry(2.1, 0), mats.foliage)
      foliage.position.set(x, 4.4, z)
      foliage.rotation.y = prop.rot
      chunk.props.add(trunk, foliage)
    }
  }

  /** Switch building materials between full (0) and simple (1). */
  private setMaterials(chunk: Chunk, variant: 0 | 1): void {
    let idx = 0
    for (const child of chunk.group.children) {
      if (idx >= chunk.materials.length) break
      if (child instanceof Mesh && chunk.materials[idx]) {
        child.material = chunk.materials[idx][variant]
        idx++
      }
    }
  }

  private rebuildActiveCollidables(): void {
    const list: Collidable[] = []
    this.grid.clear()
    for (const chunk of this.chunks.values()) {
      if (chunk.level > 0) {
        list.push(...chunk.collidables)
        for (const c of chunk.collidables) {
          const center = c.box.getCenter(boxCenterTmp)
          const { cx, cz } = this.worldToChunk(center.x, center.z)
          const key = `${cx}_${cz}`
          let cell = this.grid.get(key)
          if (!cell) {
            cell = []
            this.grid.set(key, cell)
          }
          cell.push(c)
        }
      }
    }
    this.activeCollidables = list
  }

  private disposeChunk(chunk: Chunk): void {
    // dispose geometry of buildings AND prop meshes (deep traversal)
    chunk.group.traverse(obj => {
      if (obj instanceof Mesh) obj.geometry.dispose()
    })
    for (const child of [...chunk.group.children]) {
      chunk.group.remove(child)
    }
    chunk.group.remove(chunk.props)
    for (const pair of chunk.materials) for (const mat of pair) mat.dispose()
    chunk.materials = []
    chunk.collidables = []
    chunk.props = new Group()
  }
}

interface PropMaterials {
  lamp: MeshStandardMaterial
  trunk: MeshStandardMaterial
  foliage: MeshStandardMaterial
}

function makePropMaterials(): PropMaterials {
  return {
    lamp: new MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd166, emissiveIntensity: 0.7 }),
    trunk: new MeshStandardMaterial({ color: 0x6b5b45, roughness: 0.9 }),
    foliage: new MeshStandardMaterial({ color: 0x3d8f52, roughness: 0.9 }),
  }
}
