import type { WebGLRenderer } from 'three'
import type { PostFX } from './PostFX'

const SAMPLE_INTERVAL = 2 // s
const QUALITY_UP_FPS = 50
const QUALITY_DOWN_FPS = 28

/**
 * FPS-based auto-quality scaling (Edelweiss Optimizer pattern): lowers pixel
 * ratio and disables shadows/bloom when FPS drops, restores them when it's
 * comfortable again. Keeps the game playable on weak devices.
 */
export class AutoQuality {
  private level = 2 // 2 = max, 0 = minimum
  private timer = SAMPLE_INTERVAL
  private frames = 0
  private goodSamples = 0

  constructor(
    private readonly renderer: WebGLRenderer,
    private readonly postfx: PostFX,
  ) {}

  get qualityLevel(): number {
    return this.level
  }

  frame(): void {
    this.frames++
  }

  update(dt: number): void {
    this.timer -= dt
    if (this.timer > 0) return
    this.timer = SAMPLE_INTERVAL

    const fps = this.frames / SAMPLE_INTERVAL
    this.frames = 0

    if (fps < QUALITY_DOWN_FPS && this.level > 0) {
      this.level--
      this.apply()
      this.goodSamples = 0
    } else if (fps > QUALITY_UP_FPS && this.level < 2) {
      this.goodSamples++
      if (this.goodSamples >= 2) {
        this.level++
        this.apply()
        this.goodSamples = 0
      }
    } else {
      this.goodSamples = 0
    }
  }

  private apply(): void {
    const ratio = this.level >= 2 ? Math.min(window.devicePixelRatio, 2) : this.level === 1 ? 1 : 0.7
    this.renderer.setPixelRatio(ratio)
    this.renderer.shadowMap.enabled = this.level >= 1
    this.postfx.setQuality(this.level)
    // re-render at the new resolution next frame
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
  }
}
