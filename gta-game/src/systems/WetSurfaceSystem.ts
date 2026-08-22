import {
  AdditiveBlending,
  CanvasTexture,
  Color,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  SRGBColorSpace,
} from 'three'
import { CITY_HALF } from './CityGenerator'

const RIPPLE_POOL = 48
const RIPPLE_LIFE = 1.4

const DRY_ROUGHNESS = 0.92
const WET_ROUGHNESS = 0.4

/**
 * Wet surfaces (threejs-precipitation-surfaces skill): couples the rain to a
 * ground response through ONE shared weather envelope (`WeatherSystem.rainAmount`).
 *
 * Per the skill's wet-puddle contract, roughness responds on an EARLY progress
 * band and ripples arrive on a LATE (heavy-rain) band:
 *   roughnessProgress = smoothstep(0.0, 0.75, rainFactor)
 *   normalProgress    = smoothstep(0.75, 1.0, rainFactor)
 *
 * The ground roughness/gloss transition is a material-level response (no shader
 * string injection → runtime-safe). Ripples are pooled, expanding, fading rings
 * on the wet asphalt (a stylized, visible proxy for analytic ripple normals,
 * which need browser verification and are deferred). The puddle mask is a
 * procedural canvas assigned as the ground roughnessMap so puddles read
 * glossier than surrounding asphalt. Sandbox-safe: fully procedural.
 */
export class WetSurfaceSystem {
  /** 0..1 smooth wetness envelope (testable). */
  wetness = 0

  private readonly baseColor = new Color(0xffffff)
  private readonly wetColor = new Color(0x8f98a5) // asphalt darkens when soaked
  private readonly ripples: Array<{ mesh: Mesh; age: number }> = []
  private readonly rippleMat: MeshBasicMaterial
  private spawnTimer = 0

  constructor(
    private readonly ground: MeshStandardMaterial,
    private readonly rainAmount: () => number,
  ) {
    // procedural puddle mask → roughnessMap (dark blotches = glossier puddles)
    ground.roughnessMap = buildPuddleMask()
    ground.roughnessMap.needsUpdate = true

    this.rippleMat = new MeshBasicMaterial({
      color: 0xbfd6e8,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    const geo = new RingGeometry(0.28, 0.42, 24)
    for (let i = 0; i < RIPPLE_POOL; i++) {
      const mesh = new Mesh(geo, this.rippleMat)
      mesh.rotation.x = -Math.PI / 2
      mesh.visible = false
      this.ripples.push({ mesh, age: 0 })
    }
  }

  /** All ripple meshes (added to the scene by the owner). */
  get meshes(): Mesh[] {
    return this.ripples.map(r => r.mesh)
  }

  update(dt: number): void {
    const target = this.rainAmount()
    // shared weather envelope → smooth wetness (damp, like the skill's uProgress)
    this.wetness += (target - this.wetness) * (1 - Math.exp(-0.9 * dt))

    const roughProgress = smoothstep(0, 0.75, this.wetness)
    const normalProgress = smoothstep(0.75, 1, this.wetness)

    // EARLY band: roughness collapse → wet gloss (multiplied by the puddle map)
    this.ground.roughness = DRY_ROUGHNESS + (WET_ROUGHNESS - DRY_ROUGHNESS) * roughProgress
    this.ground.metalness = 0.06 * roughProgress
    // water darkens the surface slightly
    this.ground.color.copy(this.baseColor).lerp(this.wetColor, roughProgress * 0.55)

    // LATE band: expanding ripple rings on the soaked asphalt
    this.spawnTimer -= dt
    if (normalProgress > 0.01 && this.spawnTimer <= 0) {
      this.spawnRipple()
      this.spawnTimer = 0.5 - normalProgress * 0.35
    }

    for (const r of this.ripples) {
      if (!r.mesh.visible) continue
      r.age += dt
      const t = r.age / RIPPLE_LIFE
      if (t >= 1) {
        r.mesh.visible = false
        continue
      }
      const s = 0.4 + t * 7.0
      r.mesh.scale.setScalar(s)
      ;(r.mesh.material as MeshBasicMaterial).opacity = (1 - t) * 0.55 * normalProgress
    }
  }

  private spawnRipple(): void {
    const free = this.ripples.find(r => !r.mesh.visible)
    if (!free) return
    const x = (Math.random() * 2 - 1) * (CITY_HALF - 8)
    const z = (Math.random() * 2 - 1) * (CITY_HALF - 8)
    free.mesh.position.set(x, 0.03, z)
    free.mesh.visible = true
    free.age = 0
  }

  dispose(): void {
    this.rippleMat.dispose()
    for (const r of this.ripples) r.mesh.geometry.dispose()
    this.ground.roughnessMap?.dispose()
  }
}

/** Procedural puddle mask: white base with soft dark blotches (glossier). */
function buildPuddleMask(): CanvasTexture {
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 18 + Math.random() * 60
    const shade = 0.35 + Math.random() * 0.4
    const g = ctx.createRadialGradient(x, y, 2, x, y, r)
    if (g && typeof g.addColorStop === 'function') {
      g.addColorStop(0, `rgba(${(shade * 255) | 0},${(shade * 255) | 0},${(shade * 255) | 0},1)`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    } else {
      // headless/DOM-stub fallback: solid blotch (no radial gradient API)
      ctx.fillStyle = `rgba(${(shade * 255) | 0},${(shade * 255) | 0},${(shade * 255) | 0},0.6)`
      ctx.fillRect(x - r, y - r, r * 2, r * 2)
    }
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}
