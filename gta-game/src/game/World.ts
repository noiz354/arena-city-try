import {
  AmbientLight,
  Box3,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three'
import { ChunkManager } from '../systems/ChunkManager'
import { BLOCK_COUNT, CELL, CITY_HALF, CITY_SIZE, ROAD_WIDTH } from '../systems/CityGenerator'

export interface Collidable {
  box: Box3
}

/**
 * Phase 2 world: a ~310x310m procedural city streamed in 16x16m chunks around
 * the player. Ground texture (roads/blocks) is baked onto one canvas so no
 * per-chunk ground meshes are needed.
 */
export class World {
  readonly root = new Group()
  readonly skyColor = new Color(0x87ceeb)
  readonly fog = new Fog(new Color(0xbfd4e4), 90, 420)
  readonly chunks: ChunkManager
  readonly sun: DirectionalLight

  private readonly disposables: Array<{ dispose(): void }> = []

  constructor() {
    this.chunks = new ChunkManager()
    this.root.add(this.chunks.root)

    this.sun = new DirectionalLight(0xfff4e0, 2.4)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.camera.left = -55
    this.sun.shadow.camera.right = 55
    this.sun.shadow.camera.top = 55
    this.sun.shadow.camera.bottom = -55
    this.sun.shadow.camera.near = 10
    this.sun.shadow.camera.far = 260
    this.sun.shadow.bias = -0.0005
    this.root.add(this.sun)

    this.root.add(new AmbientLight(0xffffff, 0.4))

    this.buildGround()
  }

  /** Keep the shadow frustum centered on the player (open-world pattern). */
  updateSun(playerX: number, playerZ: number): void {
    this.sun.position.set(playerX + 55, 90, playerZ + 35)
    this.sun.target.position.set(playerX, 0, playerZ)
    this.root.add(this.sun.target) // ensure target is in the scene graph
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
    const px = (m: number) => (m + CITY_HALF) / CITY_SIZE * size // meters → pixels

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
    const ground = new Mesh(geo, mat)
    ground.rotation.x = -Math.PI / 2
    ground.position.y = 0
    ground.receiveShadow = true
    this.root.add(ground)

    this.disposables.push(geo, mat, texture)

    // dark water ring beyond the city edge for depth
    const waterGeo = new PlaneGeometry(1600, 1600)
    const waterMat = new MeshStandardMaterial({ color: 0x2c5a7c, roughness: 0.4, metalness: 0.1 })
    const water = new Mesh(waterGeo, waterMat)
    water.rotation.x = -Math.PI / 2
    water.position.y = -0.15
    water.receiveShadow = true
    this.root.add(water)
    this.disposables.push(waterGeo, waterMat)
  }
}
