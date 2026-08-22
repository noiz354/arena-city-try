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
  private mouseHeld = false
  private movedSinceDown = 0
  private clickQueued = false

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
      this.mouseHeld = true
      this.movedSinceDown = 0
      this.lastMouseX = e.clientX
      this.lastMouseY = e.clientY
    }
  }

  private readonly onMouseMove = (e: MouseEvent): void => {
    if (!this.mouseDown) return
    const dx = e.clientX - this.lastMouseX
    const dy = e.clientY - this.lastMouseY
    this.mouseDelta.x += dx
    this.mouseDelta.y += dy
    this.movedSinceDown += Math.abs(dx) + Math.abs(dy)
    this.lastMouseX = e.clientX
    this.lastMouseY = e.clientY
  }

  private readonly onMouseUp = (e: MouseEvent): void => {
    if (e.button !== 0) return
    this.mouseDown = false
    this.mouseHeld = false
    // a click = press+release without meaningful drag (used for shooting)
    if (this.movedSinceDown < 8) this.clickQueued = true
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
    return codes.some(c => this.keys.has(c) || this.virtualKeys.has(c))
  }

  /** True only for the frame the key was first pressed (physical or virtual). */
  wasPressed(...codes: string[]): boolean {
    let hit = false
    for (const c of codes) {
      if (this.pressed.has(c)) hit = true
      if (this.virtualPressed.has(c)) {
        this.virtualPressed.delete(c)
        hit = true
      }
    }
    return hit
  }

  private readonly virtualPressed = new Set<string>()

  /** Edge-triggered virtual key (mobile buttons): true once until consumed. */
  consumeVirtualPress(code: string): boolean {
    return this.virtualPressed.delete(code)
  }

  pressVirtualKey(code: string): void {
    this.virtualPressed.add(code)
    this.virtualKeys.add(code)
  }

  releaseVirtualKey(code: string): void {
    this.virtualKeys.delete(code)
  }

  /** True while the left mouse button is held. */
  isMouseDown(): boolean {
    return this.mouseHeld
  }

  /** True while holding and dragging (used to avoid shooting while orbiting). */
  isDragging(): boolean {
    return this.mouseHeld && this.movedSinceDown > 8
  }

  /** Consumes a click event (press+release without drag); returns true once. */
  consumeClick(): boolean {
    const c = this.clickQueued
    this.clickQueued = false
    return c
  }

  // --- virtual input (mobile controls inject here) ---

  private readonly virtualKeys = new Set<string>()

  setVirtualKey(code: string, down: boolean): void {
    if (down) {
      this.virtualKeys.add(code)
    } else {
      this.virtualKeys.delete(code)
    }
  }

  injectClick(): void {
    this.clickQueued = true
  }

  setMouseHeld(down: boolean): void {
    this.mouseHeld = down
  }

  addMouseDelta(x: number, y: number): void {
    this.mouseDelta.x += x
    this.mouseDelta.y += y
  }

  /** Call once per frame at the end of the update. */
  endFrame(): void {
    this.pressed.clear()
    this.mouseDelta.x = 0
    this.mouseDelta.y = 0
    this.wheelDelta = 0
  }
}
