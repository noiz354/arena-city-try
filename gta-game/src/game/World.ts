import {
  AmbientLight,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three'
import { ChunkManager } from '../systems/ChunkManager'
import { SkySystem } from '../systems/SkySystem'
import { BLOCK_COUNT, CELL, CITY_HALF, CITY_SIZE, ROAD_WIDTH } from '../systems/CityGenerator'
import { snapToGrid, worldTexelSize } from '../utils/texel'

export interface Collidable {
  box: Box3
}

/**
 * Phase 2 world: a ~310x310m procedural city streamed in 16x16m chunks around
 * the player. Ground texture (roads/blocks) is baked onto one canvas so no
 * per-chunk ground meshes are needed. Beyond the city, a gently rolling
 * heightfield terrain (grass/sand) replaces the flat water plane for depth.
 *
 * Lighting stack (key/fill/rim + ambient): a shadow-casting key sun, a
 * hemisphere fill (sky→ground), a cool rim light for silhouettes at dusk, and
 * a weak ambient. The sky is a procedural gradient dome (SkySystem) driven by
 * the day/night cycle.
 */
export class World {
  readonly root = new Group()
  readonly skyColor = new Color(0x87ceeb)
  readonly fog = new Fog(new Color(0xbfd4e4), 90, 420)
  readonly chunks: ChunkManager
  readonly sun: DirectionalLight
  readonly hemi: HemisphereLight
  readonly rim: DirectionalLight
  readonly sky: SkySystem

  /** Ground material (shared with WetSurfaceSystem for the rain response). */
  groundMaterial!: MeshStandardMaterial

  /** Shadow ortho frustum half-extent (meters) and light standoff distance. */
  private readonly shadowHalf = 55
  private readonly shadowDistance = 140

  private readonly disposables: Array<{ dispose(): void }> = []

  constructor() {
    this.chunks = new ChunkManager()
    this.root.add(this.chunks.root)

    // --- key light: shadow-casting sun ---
    this.sun = new DirectionalLight(0xfff4e0, 2.4)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.left = -this.shadowHalf
    this.sun.shadow.camera.right = this.shadowHalf
    this.sun.shadow.camera.top = this.shadowHalf
    this.sun.shadow.camera.bottom = -this.shadowHalf
    this.sun.shadow.camera.near = 10
    this.sun.shadow.camera.far = 260
    this.sun.shadow.bias = -0.0005
    this.root.add(this.sun)
    this.root.add(this.sun.target) // keep the target in the scene graph

    // --- fill: hemisphere sky/ground gradient (removes flat single-color ambience) ---
    this.hemi = new HemisphereLight(0xa9c9e8, 0x4a5a44, 0.5)
    this.root.add(this.hemi)

    // --- rim: cool back light to keep building silhouettes readable ---
    this.rim = new DirectionalLight(0xbfd8ff, 0.4)
    this.rim.position.set(-60, 50, 60)
    this.root.add(this.rim)

    // --- ambient base (driven down at night by DayNightSystem) ---
    this.root.add(new AmbientLight(0xffffff, 0.4))

    // --- procedural gradient sky dome (replaces the flat scene.background color) ---
    this.sky = new SkySystem()
    this.root.add(this.sky.mesh)

    this.buildGround()
    this.buildTerrain()
  }

  /**
   * Place the sun + shadow frustum around the player along the shared sun
   * direction (threejs-shadow-systems skill). The frustum center is SNAPPED to
   * the shadow-texel grid so the shadows don't swim as the player moves, and
   * the normal bias scales with the world-space texel width (no shadow acne
   * when the frustum spans a large area). sunDir must be a unit vector.
   */
  updateSun(playerX: number, playerZ: number, sunDir: Vector3): void {
    const mapSize = this.sun.shadow.mapSize.x
    const worldTexel = worldTexelSize(this.shadowHalf, mapSize) // meters per shadow texel

    // snap the frustum center to the texel grid (kills shadow shimmer/swim)
    const tx = snapToGrid(playerX, worldTexel)
    const tz = snapToGrid(playerZ, worldTexel)

    this.sun.target.position.set(tx, 0, tz)
    this.sun.position.set(
      tx + sunDir.x * this.shadowDistance,
      sunDir.y * this.shadowDistance,
      tz + sunDir.z * this.shadowDistance,
    )

    // bias scaled by world-space texel width (stable across distance/scale)
    this.sun.shadow.normalBias = worldTexel * 1.25
  }

  /** Call every frame with the player position; returns true when chunks changed. */
  update(playerX: number, playerZ: number): boolean {
    return this.chunks.update(playerX, playerZ)
  }

  getCollidables(): Collidable[] {
    return this.chunks.getActiveCollidables()
  }

  dispose(): void {
    this.chunks.dispose()
    this.sky.dispose()
    for (const d of this.disposables) d.dispose()
  }

  /**
   * Single ground plane covering the whole city with roads/blocks/sidewalks
   * baked into a CanvasTexture — no per-chunk ground geometry.
   */
  private buildGround(): void {
    const size = 2048
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const px = (m: number) => ((m + CITY_HALF) / CITY_SIZE) * size // meters → pixels

    // base: city ground
    ctx.fillStyle = '#5a6b52' // block grass
    ctx.fillRect(0, 0, size, size)

    // draw each road (vertical + horizontal) + sidewalks + lane markings
    for (let b = 0; b < BLOCK_COUNT - 1; b++) {
      const roadStartM = (b + 1) * CELL - ROAD_WIDTH / 2
      const roadEndM = (b + 1) * CELL + ROAD_WIDTH / 2
      const x0 = px(roadStartM)
      const x1 = px(roadEndM)

      // asphalt road
      ctx.fillStyle = '#3a3d42'
      ctx.fillRect(x0, 0, x1 - x0, size)
      ctx.fillRect(0, x0, size, x1 - x0)

      // sidewalk borders
      ctx.fillStyle = '#9aa3ad'
      ctx.fillRect(x0 - px(1.5), 0, px(1.5), size)
      ctx.fillRect(x1, 0, px(1.5), size)
      ctx.fillRect(0, x0 - px(1.5), size, px(1.5))
      ctx.fillRect(0, x1, size, px(1.5))

      // dashed center lines (yellow)
      ctx.fillStyle = '#d9b53f'
      const dash = px(4)
      const gap = px(6)
      for (let y = 0; y < size; y += dash + gap) {
        ctx.fillRect(x0 + (x1 - x0) / 2 - px(0.35), y, px(0.7), dash)
        ctx.fillRect(y, x0 + (x1 - x0) / 2 - px(0.35), dash, px(0.7))
      }
    }

    // block interior texture: subtle noise so ground isn't flat-looking
    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const shade = Math.random() > 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'
      ctx.fillStyle = shade
      ctx.fillRect(x, y, 2, 2)
    }

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.anisotropy = 8

    const geo = new PlaneGeometry(CITY_SIZE + 40, CITY_SIZE + 40)
    const mat = new MeshStandardMaterial({ map: texture, roughness: 0.92, metalness: 0 })
    this.groundMaterial = mat
    const ground = new Mesh(geo, mat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    this.root.add(ground)

    this.disposables.push(geo, mat, texture)
  }

  /**
   * Rolling heightfield terrain ringing the city, replacing the old flat dark
   * "water" plane. Vertices are displaced with layered sine noise and eased to
   * y=0 near the city so the flat road grid meets the terrain cleanly. Texture
   * is a tiling grass/sand canvas.
   */
  private buildTerrain(): void {
    const size = 1600
    const seg = 96
    const geo = new PlaneGeometry(size, size, seg, seg)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position
    // stay flat under the whole square ground plane (half-diagonal ≈ 248m) so
    // hills never poke through the city corners; ease in beyond that radius
    const cityEdge = 250
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      const r = Math.hypot(x, z)
      const ease = smoothstep(r, cityEdge, cityEdge + 130)
      const h = terrainHeight(x, z) * ease
      pos.setY(i, h)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()

    const tex = makeTerrainTexture()
    const mat = new MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
    const terrain = new Mesh(geo, mat)
    terrain.position.y = -0.2
    terrain.receiveShadow = true
    this.root.add(terrain)

    this.disposables.push(geo, mat, tex)
  }
}

/**
 * World-space Y of the outer terrain surface at (x,z) — the eased heightfield
 * minus the terrain mesh's -0.2 offset. Exported so vegetation can place grass
 * blades exactly on the surface.
 */
export function terrainSurfaceY(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const ease = smoothstep(r, 250, 250 + 130)
  return terrainHeight(x, z) * ease - 0.2
}

/** Layered sine noise → gentle rolling hills (amplitude in meters). */
function terrainHeight(x: number, z: number): number {
  let h = 0
  h += Math.sin(x * 0.02) * Math.cos(z * 0.024) * 3.2
  h += Math.sin(x * 0.06 + 1.3) * Math.cos(z * 0.055) * 1.4
  h += Math.sin(z * 0.045 + 2.1) * Math.cos(x * 0.038) * 2.1
  h += Math.sin((x + z) * 0.12) * 0.6
  return h
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

/** Tiling grass canvas with sand patches + mottling for the outer terrain. */
function makeTerrainTexture(): CanvasTexture {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#5d7a4c'
  ctx.fillRect(0, 0, size, size)

  // mottled grass
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const g = 90 + Math.floor(Math.random() * 70)
    ctx.fillStyle = `rgba(${40 + Math.floor(Math.random() * 30)},${g},${50 + Math.floor(Math.random() * 30)},0.5)`
    ctx.fillRect(x, y, 3, 3)
  }

  // sandy/dirt patches
  for (let p = 0; p < 26; p++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 12 + Math.random() * 40
    const g = ctx.createRadialGradient(x, y, 2, x, y, r)
    g.addColorStop(0, 'rgba(196,175,122,0.85)')
    g.addColorStop(1, 'rgba(196,175,122,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.repeat.set(6, 6)
  tex.anisotropy = 4
  return tex
}
