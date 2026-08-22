/**
 * Keyboard + mouse-drag input manager.
 * Adapted from the mavonengine InputManager pattern (key state set + delta tracking).
 */
export class InputManager {
  private readonly keys = new Set<string>()
  private readonly pressed = new Set<string>()
  private mouseDown = false
  private lastMouseX = 0
  private lastMouseY = 0

  /** Accumulated drag deltas since the last update() call (pixels). */
  mouseDelta = { x: 0, y: 0 }

  /** Accumulated scroll wheel delta since the last update() call. */
  wheelDelta = 0

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (e.repeat) return
    this.keys.add(e.code)
    this.pressed.add(e.code)
    // prevent page scroll with space/arrows
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
  }

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
  }

  private readonly onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = true
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.mouseDown) return
    this.mouseDelta.x += e.clientX - this.lastMouseX
    this.mouseDelta.y += e.clientY - this.lastMouseY
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  private readonly onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseDown = false
  }

  private readonly onWheel = (e: WheelEvent): void => {
    this.wheelDelta += e.deltaY
  }

  attach(target: HTMLElement): void {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    target.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('wheel', this.onWheel, { passive: true })
  }

  detach(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('wheel', this.onWheel)
  }

  /** True while any of the given key codes are held. */
  isDown(...codes: string[]): boolean {
    return codes.some(c => this.keys.has(c))
  }

  /** True only for the frame the key was first pressed. */
  wasPressed(...codes: string[]): boolean {
    return codes.some(c => this.pressed.has(c))
  }

  /** Call once per frame at the end of the update. */
  endFrame(): void {
    this.pressed.clear()
    this.mouseDelta.x = 0
    this.mouseDelta.y = 0
    this.wheelDelta = 0
  }
}
