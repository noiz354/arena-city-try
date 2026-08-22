import { PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

/**
 * Post-processing (racing GameScene pattern): bloom via EffectComposer, plus a
 * decaying screen-shake that offsets the camera before each render.
 */
export class PostFX {
  readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly shakeOffset = new Vector3()
  private shake = 0
  enabled = true

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 0.82)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h)
    this.bloom.setSize(w, h)
  }

  addShake(intensity: number): void {
    this.shake = Math.min(this.shake + intensity, 1.2)
  }

  update(dt: number): void {
    this.shake = Math.max(0, this.shake - dt * 2.2)
    if (this.shake > 0.005) {
      this.shakeOffset.set(
        (Math.random() - 0.5) * this.shake * 0.35,
        (Math.random() - 0.5) * this.shake * 0.35,
        (Math.random() - 0.5) * this.shake * 0.2,
      )
    } else {
      this.shakeOffset.set(0, 0, 0)
    }
  }

  /** Offset the camera by the shake (call before render, restore after). */
  applyShake(camera: PerspectiveCamera): void {
    camera.position.add(this.shakeOffset)
  }

  restoreShake(camera: PerspectiveCamera): void {
    camera.position.sub(this.shakeOffset)
  }

  /** FPS-based quality scaling (Edelweiss Optimizer pattern). */
  setQuality(level: number): void {
    // level 2 = full, 1 = reduced bloom, 0 = no bloom
    this.bloom.enabled = level >= 1
    this.bloom.strength = level >= 2 ? 0.55 : 0.3
    this.enabled = level >= 1
  }
}
