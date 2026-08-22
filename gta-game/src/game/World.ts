import {
  AmbientLight,
  Box3,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Fog,
  GridHelper,
  Group,
  Material,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from 'three'

const WORLD_SIZE = 100 // 100x100 ground per Phase 0 spec

/** Axis-aligned collidable (building box) for player/camera collision. */
export interface Collidable {
  box: Box3
}

/**
 * Phase 0 world: sky, fog, lights with shadows, ground plane, and a few
 * placeholder boxes to verify lighting/shadow rendering. The procedural city
 * generator replaces the placeholder boxes in Phase 2.
 */
export class World {
  readonly root = new Group()
  readonly skyColor = new Color(0x87ceeb)
  readonly fog = new Fog(new Color(0x87ceeb), 80, 400)

  private readonly disposables: Array<{ dispose(): void }> = []
  private readonly collidables: Collidable[] = []

  /** Axis-aligned building boxes for player/camera collision. */
  getCollidables(): Collidable[] {
    return this.collidables
  }

  constructor() {
    this.buildEnvironment()
    this.buildGround()
    this.buildPlaceholderBuildings()
  }

  private buildEnvironment(): void {
    // Sky + ambient fill (inline, no external HDR)
    this.root.add(new AmbientLight(0xffffff, 0.35))

    const sun = new DirectionalLight(0xfff4e0, 2.4)
    sun.position.set(50, 80, 30)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.left = -WORLD_SIZE / 2
    sun.shadow.camera.right = WORLD_SIZE / 2
    sun.shadow.camera.top = WORLD_SIZE / 2
    sun.shadow.camera.bottom = -WORLD_SIZE / 2
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 250
    sun.shadow.bias = -0.0005
    this.root.add(sun)
  }

  private buildGround(): void {
    const groundGeo = new PlaneGeometry(WORLD_SIZE, WORLD_SIZE)
    const groundMat = new MeshStandardMaterial({
      map: this.makeAsphaltTexture(),
      roughness: 0.9,
      metalness: 0.0,
    })
    const ground = new Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    this.root.add(ground)

    const grid = new GridHelper(WORLD_SIZE, 20, 0x444466, 0x333355)
    grid.position.y = 0.02
    const gridMat = grid.material as Material
    gridMat.transparent = true
    gridMat.opacity = 0.35
    this.root.add(grid)

    this.disposables.push(groundGeo, groundMat)
  }

  /** Procedural asphalt texture via CanvasTexture — sandbox-safe (no image files). */
  private makeAsphaltTexture(): Texture {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#3a3d42'
    ctx.fillRect(0, 0, size, size)

    // subtle noise speckles
    for (let i = 0; i < 14000; i++) {
      const x = Math.random() * size
      const y = Math.random() * size
      const shade = Math.random() > 0.5 ? '#43474d' : '#33363b'
      ctx.fillStyle = shade
      ctx.fillRect(x, y, 1.2, 1.2)
    }

    // faint road lines for orientation
    ctx.strokeStyle = 'rgba(220, 220, 200, 0.12)'
    ctx.lineWidth = 6
    for (let i = 0; i < size; i += 128) {
      ctx.beginPath()
      ctx.moveTo(i, 0)
      ctx.lineTo(i, size)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i)
      ctx.lineTo(size, i)
      ctx.stroke()
    }

    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(8, 8)
    this.disposables.push(texture)
    return texture
  }

  /** Placeholder boxes to verify shadows/lighting until the city gen (Phase 2). */
  private buildPlaceholderBuildings(): void {
    const palette = [0xb5c4d4, 0xc9b58f, 0xa8b8a0, 0x8fa3b8]
    for (let i = 0; i < 14; i++) {
      const w = MathUtils.randFloat(3, 6)
      const d = MathUtils.randFloat(3, 6)
      const h = MathUtils.randFloat(3, 12)
      const x = (Math.random() > 0.5 ? 1 : -1) * MathUtils.randFloat(8, 42)
      const z = (Math.random() > 0.5 ? 1 : -1) * MathUtils.randFloat(8, 42)

      const geo = new BoxGeometry(w, h, d)
      const mat = new MeshStandardMaterial({
        color: palette[i % palette.length],
        roughness: 0.85,
        metalness: 0.05,
      })
      const mesh = new Mesh(geo, mat)
      mesh.position.set(x, h / 2, z)
      mesh.castShadow = true
      mesh.receiveShadow = true
      this.root.add(mesh)
      this.disposables.push(geo, mat)

      // register AABB for collision (buildings never rotate)
      this.collidables.push({ box: new Box3().setFromObject(mesh) })
    }
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose()
  }
}
