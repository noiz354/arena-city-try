import {
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
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
  type ChunkContent,
  type PropSpec,
} from './CityGenerator'
import type { Collidable } from '../game/World'

// LOD rings (Chebyshev distance in chunks from the player's chunk):
//   d <= 1  → level 2: full detail (windows texture + props)
//   d == 2  → level 1: simple (single InstancedMesh per chunk — 1 draw call)
//   d >  2  → level 0: hidden
const FULL_RADIUS = 1
const SIMPLE_RADIUS = 3 // ponytail: prefetch Lite A2 2->3 (+24 chunks 25->49) rollback if gzip +2kB blows budget

interface Chunk {
  key: string
  cx: number
  cz: number
  group: Group
  level: number
  built: boolean
  // ponytail: TypedArray DPZ dirty per openworld-js addobj.js:22 — per-chunk rebuild flag
  dirty: boolean
  collidables: Collidable[]
  /** full-detail building meshes (level 2) */
  buildingsGroup: Group
  /** per-building materials: [full, simple] (simple unused — kept for dispose) */
  materials: MeshStandardMaterial[][]
  props: Group
  /** instanced simple buildings (level 1) — one draw call per chunk */
  simpleInstances: InstancedMesh | null
}

const boxCenterTmp = new Vector3() // scratch for getCenter without allocation
const instMatrix = new Matrix4() // scratch for building instance matrices
const instColor = new Color()

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
 * - level 2 (near) = individual meshes with window textures + props
 * - level 1 (mid)  = ONE InstancedMesh per chunk (instance colors) → the
 *   ~100+ far building draw calls collapse to ~16
 * - builds/disposes meshes on activate/deactivate (memory cleanup)
 */
export class ChunkManager {
  readonly root = new Group()
  private readonly chunks = new Map<string, Chunk>()
  private activeCollidables: Collidable[] = []
  /** Static building collidables indexed by chunk cell (rebuilt on activation change). */
  private readonly grid = new Map<string, Collidable[]>()
  // ponytail: DPZ dirty-flag — skip ring recompute when player stays in same chunk cell
  private lastCx = 9999
  private lastCz = 9999

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
          built: false,
          dirty: true,
          collidables: [],
          buildingsGroup: new Group(),
          materials: [],
          props: new Group(),
          simpleInstances: null,
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
    if (cx === this.lastCx && cz === this.lastCz) return false
    this.lastCx = cx; this.lastCz = cz
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
    if (level === 0) {
      chunk.group.visible = false
      return
    }
    if (!chunk.built) this.buildChunk(chunk)
    chunk.group.visible = true
    // level 2: full-detail meshes + props ; level 1: single instanced mesh
    const full = level === 2
    chunk.buildingsGroup.visible = full
    chunk.props.visible = full
    if (chunk.simpleInstances) chunk.simpleInstances.visible = !full
  }

  /** Build every representation of a chunk once (meshes + collidables). */
  private buildChunk(chunk: Chunk): void {
    chunk.built = true
    chunk.dirty = false // ponytail: clear DPZ dirty after build (openworld-js chunkManager.js:34)
    const content = generateChunk(chunk.cx, chunk.cz)
    const originX = this.chunkWorldX(chunk.cx)
    const originZ = this.chunkWorldZ(chunk.cz)
    // place the chunk group at its grid corner so local mesh coords resolve to world space
    chunk.group.position.set(originX, 0, originZ)

    // full-detail building meshes (level 2) + collidables
    for (const spec of content.buildings) {
      this.buildBuilding(chunk, spec, originX, originZ)
    }
    chunk.group.add(chunk.buildingsGroup)

    // props (level 2 only)
    chunk.props = new Group()
    if (content.props.length > 0) {
      const mats = makePropMaterials()
      // track prop materials so they can be disposed with the chunk
      chunk.materials.push([mats.lamp, mats.trunk, mats.foliage, mats.hydrant, mats.bench, mats.rock])
      for (const prop of content.props) {
        this.buildProp(chunk, prop, originX, originZ, mats)
      }
    }
    chunk.group.add(chunk.props)

    // simple instanced buildings (level 1) — 1 draw call for the whole chunk
    chunk.simpleInstances = this.buildSimpleInstances(content, originX, originZ)
    chunk.group.add(chunk.simpleInstances)
    chunk.simpleInstances.visible = false
    chunk.group.visible = false
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
    chunk.buildingsGroup.add(mesh)
    chunk.materials.push([fullMat, simpleMat])

    chunk.collidables.push({
      box: new Box3(
        new Vector3(spec.cx - spec.w / 2, 0, spec.cz - spec.d / 2),
        new Vector3(spec.cx + spec.w / 2, spec.h, spec.cz + spec.d / 2),
      ),
    })
  }

  /** InstancedMesh of unit boxes scaled/positioned per building, colored by spec. */
  private buildSimpleInstances(content: ChunkContent, originX: number, originZ: number): InstancedMesh {
    // ponytail: TypedArray SoA path mirrors openworld-js addobj.js:22 — one Matrix+Color per instance, no AoS alloc
    const hasTyped = content.buildingData.length > 0
    const count = hasTyped ? content.buildingData.length / 5 : content.buildings.length
    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshStandardMaterial({ roughness: 0.85, vertexColors: true })
    const inst = new InstancedMesh(geometry, material, count)
    inst.castShadow = true
    inst.receiveShadow = true
    if (hasTyped) {
      const d = content.buildingData
      const c = content.buildingColors
      for (let i = 0; i < count; i++) {
        const cx = d[i * 5 + 0], cz = d[i * 5 + 1], w = d[i * 5 + 2], dd = d[i * 5 + 3], h = d[i * 5 + 4]
        instMatrix.makeScale(w, h, dd)
        instMatrix.setPosition(cx - originX, h / 2, cz - originZ)
        inst.setMatrixAt(i, instMatrix)
        inst.setColorAt(i, instColor.setHex(c[i]))
      }
    } else {
      content.buildings.forEach((spec, i) => {
        instMatrix.makeScale(spec.w, spec.h, spec.d)
        instMatrix.setPosition(spec.cx - originX, spec.h / 2, spec.cz - originZ)
        inst.setMatrixAt(i, instMatrix)
        inst.setColorAt(i, instColor.setHex(spec.color))
      })
    }
    inst.instanceMatrix.needsUpdate = true
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true
    return inst
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
      // growth-hierarchy tree (threejs-procedural-vegetation): a tapered trunk,
      // a few angled branches, and leaf clusters at the tips — deterministic
      // from the tree's world position so it is stable across chunk reloads.
      const tree = buildTree(x, z, prop.rot, mats)
      chunk.props.add(tree)
    } else if (prop.kind === 'bush') {
      // two overlapping low icosahedra for a fuller shrub silhouette
      const bush = new Mesh(new IcosahedronGeometry(0.8, 0), mats.foliage)
      bush.position.set(x, 0.55, z)
      bush.rotation.y = prop.rot
      bush.castShadow = true
      const bush2 = new Mesh(new IcosahedronGeometry(0.55, 0), mats.foliage)
      bush2.position.set(x + 0.4, 0.4, z + 0.2)
      bush2.rotation.y = prop.rot
      bush2.castShadow = true
      chunk.props.add(bush, bush2)
    } else if (prop.kind === 'hydrant') {
      const body = new Mesh(new CylinderGeometry(0.22, 0.26, 0.7, 8), mats.hydrant)
      body.position.set(x, 0.35, z)
      const cap = new Mesh(new SphereGeometry(0.22, 10, 8), mats.hydrant)
      cap.position.set(x, 0.72, z)
      chunk.props.add(body, cap)
    } else if (prop.kind === 'bench') {
      const seat = new Mesh(new BoxGeometry(1.6, 0.08, 0.5), mats.bench)
      seat.position.set(x, 0.5, z)
      const back = new Mesh(new BoxGeometry(1.6, 0.5, 0.08), mats.bench)
      back.position.set(x, 0.72, z - 0.22)
      const leg1 = new Mesh(new BoxGeometry(0.1, 0.5, 0.4), mats.bench)
      leg1.position.set(x - 0.7, 0.25, z)
      const leg2 = new Mesh(new BoxGeometry(0.1, 0.5, 0.4), mats.bench)
      leg2.position.set(x + 0.7, 0.25, z)
      const group = new Group()
      group.add(seat, back, leg1, leg2)
      group.rotation.y = prop.rot
      group.position.set(x, 0, z)
      chunk.props.add(group)
    } else if (prop.kind === 'rock') {
      const rock = new Mesh(new IcosahedronGeometry(0.7, 0), mats.rock)
      rock.position.set(x, 0.3, z)
      rock.scale.set(1, 0.6, 0.8)
      rock.rotation.y = prop.rot
      rock.castShadow = true
      chunk.props.add(rock)
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
    // dispose geometry of building meshes + props (deep traversal)
    chunk.group.traverse(obj => {
      if (obj instanceof Mesh) obj.geometry.dispose()
    })
    // instanced mesh has its own geometry + material
    if (chunk.simpleInstances) {
      chunk.simpleInstances.geometry.dispose()
      const im = chunk.simpleInstances.material as MeshStandardMaterial
      im.dispose()
      chunk.simpleInstances = null
    }
    for (const child of [...chunk.group.children]) chunk.group.remove(child)
    for (const pair of chunk.materials) for (const mat of pair) mat.dispose()
    chunk.buildingsGroup = new Group()
    chunk.materials = []
    chunk.collidables = []
    chunk.props = new Group()
    chunk.built = false
    chunk.dirty = true
  }
}

interface PropMaterials {
  lamp: MeshStandardMaterial
  trunk: MeshStandardMaterial
  foliage: MeshStandardMaterial
  hydrant: MeshStandardMaterial
  bench: MeshStandardMaterial
  rock: MeshStandardMaterial
}

/** Deterministic 0..1 value from a tree's world position (stable across reloads). */
function treeSeed(x: number, z: number): number {
  let h = (Math.round(x * 16) + 7) * 374761393 + (Math.round(z * 16) + 11) * 668265263
  h = (h ^ (h >> 13)) * 1274126177
  return ((h ^ (h >> 16)) >>> 0) / 4294967296
}

/**
 * Build a growth-hierarchy tree as a Group (trunk → branches → leaf clusters).
 * Branch count/angles/canopy scale vary deterministically with `seed` so the
 * forest reads varied without any randomness at render time.
 */
function buildTree(x: number, z: number, rot: number, mats: PropMaterials): Group {
  const group = new Group()
  const s = treeSeed(x, z)

  // tapered trunk
  const trunkH = 2.4 + s * 1.2
  const trunk = new Mesh(new CylinderGeometry(0.16, 0.34, trunkH, 7), mats.trunk)
  trunk.position.y = trunkH / 2
  trunk.castShadow = true
  group.add(trunk)

  // branches: 2–4, angled outward from the upper trunk
  const branchCount = 2 + Math.floor(s * 3)
  for (let i = 0; i < branchCount; i++) {
    const a = (i / branchCount) * Math.PI * 2 + s * 1.7
    const lift = 0.5 + s * 0.4
    const len = 1.1 + ((i * 0.37 + s) % 1) * 1.0
    const branch = new Mesh(new CylinderGeometry(0.05, 0.12, len, 5), mats.trunk)
    branch.position.set(
      Math.cos(a) * 0.35,
      trunkH * (0.55 + 0.3 * ((i % 2) + s * 0.5)),
      Math.sin(a) * 0.35,
    )
    branch.rotation.z = Math.cos(a) * (Math.PI / 2 - lift)
    branch.rotation.x = Math.sin(a) * (Math.PI / 2 - lift)
    branch.castShadow = true
    group.add(branch)

    // leaf cluster at each branch tip
    const leaf = new Mesh(new IcosahedronGeometry(0.7 + s * 0.4, 0), mats.foliage)
    const tip = branch.position
      .clone()
      .add(new Vector3(Math.cos(a) * len * 0.6, Math.sin(lift) * len * 0.6, Math.sin(a) * len * 0.6))
    leaf.position.copy(tip)
    leaf.scale.setScalar(0.8 + ((i * 0.31 + s) % 1) * 0.6)
    leaf.castShadow = true
    group.add(leaf)
  }

  // central canopy
  const canopy = new Mesh(new IcosahedronGeometry(1.6 + s * 0.9, 0), mats.foliage)
  canopy.position.y = trunkH + 0.7
  canopy.scale.y = 0.8
  canopy.castShadow = true
  group.add(canopy)

  group.position.set(x, 0, z)
  group.rotation.y = rot
  return group
}

function makePropMaterials(): PropMaterials {
  return {
    lamp: new MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd166, emissiveIntensity: 0.7 }),
    trunk: new MeshStandardMaterial({ color: 0x6b5b45, roughness: 0.9 }),
    foliage: new MeshStandardMaterial({ color: 0x3d8f52, roughness: 0.9 }),
    hydrant: new MeshStandardMaterial({ color: 0xc0392b, roughness: 0.5, metalness: 0.2 }),
    bench: new MeshStandardMaterial({ color: 0x8a6b4a, roughness: 0.85 }),
    rock: new MeshStandardMaterial({ color: 0x8b8f96, roughness: 0.95 }),
  }
}
