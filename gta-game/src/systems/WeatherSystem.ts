import { BufferGeometry, Color, Float32BufferAttribute, LineBasicMaterial, LineSegments, MathUtils, Scene, Vector3 } from 'three'

const RAIN_COUNT = 500
const RAIN_SPREAD = 45
const RAIN_LENGTH = 0.35

/**
 * Weather: clear ↔ rain cycles (30–70s). Rain is a pooled LineSegments field
 * that follows the camera, and fog/sky darken slightly while it rains.
 */
export class WeatherSystem {
  raining = false
  /** 0..1 smooth rain transition (read by Game to tint sky slightly). */
  rainAmount = 0
  private timer = 30 // time until the next weather change
  private readonly rain: LineSegments
  private readonly positions: Float32Array
  private readonly baseColors = new Color(0x9fb4c8)

  constructor(
    private readonly scene: Scene,
    private readonly fog: { near: number; far: number },
  ) {
    const geo = new BufferGeometry()
    this.positions = new Float32Array(RAIN_COUNT * 6)
    for (let i = 0; i < RAIN_COUNT; i++) this.resetDrop(i, 0)
    geo.setAttribute('position', new Float32BufferAttribute(this.positions, 3))
    const mat = new LineBasicMaterial({
      color: this.baseColors,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
    this.rain = new LineSegments(geo, mat)
    this.rain.frustumCulled = false
    this.rain.visible = false
    this.scene.add(this.rain)
  }

  private resetDrop(i: number, baseY: number): void {
    const idx = i * 6
    const x = (Math.random() - 0.5) * RAIN_SPREAD * 2
    const y = baseY + Math.random() * 90 - 45
    const z = (Math.random() - 0.5) * RAIN_SPREAD * 2
    this.positions[idx] = x
    this.positions[idx + 1] = y
    this.positions[idx + 2] = z
    this.positions[idx + 3] = x + (Math.random() - 0.5) * 0.08
    this.positions[idx + 4] = y + RAIN_LENGTH
    this.positions[idx + 5] = z + (Math.random() - 0.5) * 0.08
  }

  /** Fall speed per second. */
  update(dt: number, cameraPos: Vector3): void {
    this.timer -= dt
    if (this.timer <= 0) {
      this.raining = !this.raining
      this.timer = 30 + Math.random() * 40
    }
    this.rainAmount = MathUtils.damp(this.rainAmount, this.raining ? 1 : 0, 0.8, dt)

    const amount = this.rainAmount
    this.rain.visible = amount > 0.02

    if (this.rain.visible) {
      // keep the rain field centered on the camera
      this.rain.position.set(cameraPos.x, 0, cameraPos.z)
      const attr = this.rain.geometry.getAttribute('position') as Float32BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < RAIN_COUNT; i++) {
        const idx = i * 6
        arr[idx + 1] -= 60 * dt
        arr[idx + 4] -= 60 * dt
        if (arr[idx + 4] < -45) this.resetDrop(i, 0)
      }
      attr.needsUpdate = true
      ;(this.rain.material as LineBasicMaterial).opacity = 0.55 * amount
    }

    // weather tightens fog (colors stay owned by day/night system)
    this.fog.near = MathUtils.lerp(90, 45, amount)
    this.fog.far = MathUtils.lerp(420, 170, amount)
  }
}
