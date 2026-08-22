import {
  ACESFilmicToneMapping,
  Clock,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { World } from './World'
import { Player } from '../entities/Player'
import { CameraRig } from '../systems/CameraRig'
import { InputManager } from '../utils/InputManager'

export interface GameOptions {
  container: HTMLElement
}

/**
 * Core game shell — adapted from the mavonengine-core BaseGame/Game pattern.
 * Owns renderer, camera, scene, input, and the animation loop.
 * Systems register `onUpdate` callbacks (physics, AI, etc. hook in here later).
 */
export class Game {
  readonly clock = new Clock()
  readonly scene = new Scene()
  readonly camera: PerspectiveCamera
  readonly renderer: WebGLRenderer
  readonly world: World
  readonly player: Player
  readonly cameraRig: CameraRig
  readonly input: InputManager

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

    // --- Input ---
    this.input = new InputManager()
    this.input.attach(container)

    // --- World ---
    this.world = new World()
    this.scene.fog = this.world.fog
    this.scene.background = this.world.skyColor
    this.scene.add(this.world.root)

    // --- Player + third-person camera rig ---
    this.player = new Player()
    this.player.group.position.set(0, 0.95, 0)
    this.scene.add(this.player.group)

    this.cameraRig = new CameraRig(this.camera)

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
    this.input.detach()
    window.removeEventListener('resize', this.resize)
    this.world.dispose()
    this.renderer.dispose()
  }

  private loop = (): void => {
    if (!this.running) return
    this.animationId = requestAnimationFrame(this.loop)

    const delta = Math.min(this.clock.getDelta(), 0.05) // clamp large gaps (tab switch)
    this.update(delta)
  }

  private update(delta: number): void {
    const collidables = this.world.getCollidables()

    // gameplay update
    this.player.update(delta, this.input, this.cameraRig.yaw, collidables)
    this.cameraRig.update(delta, this.input, this.player.position, collidables)

    // external systems + render
    this.updateCallbacks.forEach(cb => cb(delta))
    this.renderer.render(this.scene, this.camera)

    this.input.endFrame()
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
