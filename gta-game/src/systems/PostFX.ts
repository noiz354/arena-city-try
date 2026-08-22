import { PerspectiveCamera, Scene, Vector2, Vector3, WebGLRenderer } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js'
import { LUTPass } from 'three/examples/jsm/postprocessing/LUTPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { buildGradeLUT } from './ColorGrade'

/**
 * HDR image pipeline (threejs-image-pipeline + bloom + exposure-color-grading +
 * screen-space-ambient-occlusion skills): an ordered, single-owner post chain
 * running in linear HDR (EffectComposer default HalfFloat target).
 *
 *   RenderPass → GTAO (ambient occlusion, indirect only) → HDR bloom
 *   → LUT grade (scene-referred) → OutputPass (tone map + sRGB)
 *
 * Tone mapping has a single owner (the renderer's ACESFilmicToneMapping, applied
 * by OutputPass); the LUT is a scene-referred creative grade placed BEFORE tone
 * mapping so the two never fight. Exposure is a single knob on the renderer
 * (renderer.toneMappingExposure) driven by the day/night system. Bloom
 * composites before tone mapping; each effect is toggleable and wired to the
 * AutoQuality tiers. GTAO modulates indirect only (it blends a visibility term,
 * not a dark multiply over emissive/direct).
 */
export class PostFX {
  readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly gtao: GTAOPass
  private readonly lut: LUTPass
  private readonly shakeOffset = new Vector3()
  private shake = 0
  enabled = true

  constructor(
    private readonly renderer: WebGLRenderer,
    scene: Scene,
    camera: PerspectiveCamera,
  ) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))

    // ambient occlusion (half-res internally; modulates indirect only)
    this.gtao = new GTAOPass(scene, camera, 1, 1)
    this.gtao.output = GTAOPass.OUTPUT.Default
    this.composer.addPass(this.gtao)

    // HDR bloom (pre-tone-map)
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 0.82)
    this.composer.addPass(this.bloom)

    // generated scene-referred grade LUT
    this.lut = new LUTPass({ lut: buildGradeLUT(33), intensity: 1.0 })
    this.composer.addPass(this.lut)

    // tone mapping + sRGB output (single owner of tone mapping)
    this.composer.addPass(new OutputPass())

    // size all passes to the renderer immediately (fixes the old 1×1-pass state
    // that persisted until the first window resize)
    const size = renderer.getSize(new Vector2())
    this.setSize(size.width, size.height)
  }

  setSize(w: number, h: number): void {
    this.composer.setSize(w, h)
    this.bloom.setSize(w, h)
    this.gtao.setSize(w, h)
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

  /**
   * Set the single exposure knob (renderer.toneMappingExposure). Tone mapping
   * has one owner (ACES in OutputPass); this is its exposure. Driven by the
   * day/night scene-light model so nights read darker than noon.
   */
  setExposure(value: number): void {
    this.renderer.toneMappingExposure = value
  }

  /** Offset the camera by the shake (call before render, restore after). */
  applyShake(camera: PerspectiveCamera): void {
    camera.position.add(this.shakeOffset)
  }

  restoreShake(camera: PerspectiveCamera): void {
    camera.position.sub(this.shakeOffset)
  }

  /**
   * FPS-based quality scaling (Edelweiss Optimizer pattern). GTAO is the most
   * expensive effect → highest tier only. Bloom strength reduces; the LUT is
   * cheap and always on while post is enabled.
   */
  setQuality(level: number): void {
    this.gtao.enabled = level >= 2
    this.bloom.enabled = level >= 1
    this.bloom.strength = level >= 2 ? 0.55 : 0.3
    this.lut.enabled = true
    this.enabled = level >= 1
  }

  dispose(): void {
    this.composer.dispose()
    this.lut.lut?.dispose()
  }
}
