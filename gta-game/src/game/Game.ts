import { Clock, PerspectiveCamera, Scene, WebGLRenderer, ACESFilmicToneMapping, PCFSoftShadowMap } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { World } from './World'

export interface GameOptions {
  container: HTMLElement
}

/**
 * Core game shell — adapted from the mavonengine-core BaseGame/Game pattern.
 * Owns renderer, camera, scene, debug controls, and the animation loop.
 * Systems register `onUpdate` callbacks (physics, AI, etc. hook in here later).
 */
export class Game {
  readonly clock = new Clock()
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly controls: OrbitControls
  readonly world: World

  private readonly updateCallbacks = new Set<(delta: number) => void>()
  private animationId = 0
  private running = false

  constructor({ container }: GameOptions) {
    // --- Renderer ---
    this.renderer = new WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFSoftShadowMap
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    container.appendChild(this.renderer.domElement)

    // --- Camera ---
    const aspect = container.clientWidth / Math.max(container.clientHeight, 1)
    this.camera = new PerspectiveCamera(60, aspect, 0.1, 2000)
    this.camera.position.set(28, 22, 38)
    this.camera.lookAt(0, 2, 0)

    // --- Debug controls (replaced by player camera in Phase 1) ---
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.set(0, 2, 0)
    this.controls.enableDamping = true
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05
    this.controls.minDistance = 3
    this.controls.maxDistance = 150

    // --- World ---
    this.world = new World()
    this.scene.fog = this.world.fog
    this.scene.background = this.world.skyColor
    this.scene.add(this.world.root)

    // --- Resize ---
    window.addEventListener('resize', this.resize)

    this.clock.start()
  }

  onUpdate(callback: (delta: number) => void): void {
    this.updateCallbacks.add(callback)
  }

  start(): void {
    if (this.running) return
    this.running = true
    this.loop()
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.animationId)
  }

  destroy(): void {
    this.stop()
    window.removeEventListener('resize', this.resize)
    this.world.dispose()
    this.renderer.dispose()
  }

  private loop = (): void => {
    if (!this.running) return
    this.animationId = requestAnimationFrame(this.loop)

    const delta = this.clock.getDelta()
    this.update(delta)
  }

  private update(delta: number): void {
    this.controls.update()
    this.updateCallbacks.forEach(cb => cb(delta))
    this.renderer.render(this.scene, this.camera)
  }

  private resize = (): void => {
    const container = this.renderer.domElement.parentElement
    if (!container) return
    const width = container.clientWidth
    const height = Math.max(container.clientHeight, 1)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
}
