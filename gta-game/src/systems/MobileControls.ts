import type { InputManager } from '../utils/InputManager'

const JOY_RADIUS = 48

/**
 * Mobile touch controls (shown on touch devices only):
 * - left half: virtual joystick → WASD virtual keys
 * - right half: drag to look (injects mouse deltas)
 * - buttons: JUMP, SPRINT, E (enter/action), FIRE
 * All injected through the shared InputManager so the rest of the game is
 * unaware of the input source.
 */
export class MobileControls {
  readonly active: boolean
  private joystickActive = false
  private joystickId = -1
  private lookId = -1
  private lookX = 0
  private lookY = 0
  private readonly stickCenter = { x: 0, y: 0 }
  private readonly stickKnob = { x: 0, y: 0 }
  private readonly stickEl: HTMLDivElement
  private readonly knobEl: HTMLDivElement
  private readonly buttons: HTMLDivElement

  constructor(private readonly input: InputManager) {
    this.active = window.matchMedia?.('(pointer: coarse)').matches ?? false
    if (!this.active) {
      this.stickEl = document.createElement('div')
      this.knobEl = document.createElement('div')
      this.buttons = document.createElement('div')
      return
    }

    // joystick
    this.stickEl = document.createElement('div')
    this.stickEl.className = 'mc-stick'
    this.knobEl = document.createElement('div')
    this.knobEl.className = 'mc-stick-knob'
    this.stickEl.appendChild(this.knobEl)
    this.buttons = document.createElement('div')
    this.buttons.className = 'mc-buttons'

    const mk = (label: string, cls: string, onDown: () => void, onUp?: () => void) => {
      const b = document.createElement('div')
      b.className = `mc-btn ${cls}`
      b.textContent = label
      b.addEventListener('touchstart', e => {
        e.preventDefault()
        onDown()
      }, { passive: false })
      b.addEventListener('touchend', e => {
        e.preventDefault()
        onUp?.()
      }, { passive: false })
      this.buttons.appendChild(b)
    }

    mk('FIRE', 'mc-fire', () => {
      this.input.setMouseHeld(true)
    }, () => {
      this.input.setMouseHeld(false)
    })
    mk('E', 'mc-e', () => this.input.pressVirtualKey('KeyE'))
    mk('⤒', 'mc-jump', () => this.input.pressVirtualKey('Space'))
    mk('RUN', 'mc-sprint', () => this.input.setVirtualKey('ShiftLeft', true), () => this.input.setVirtualKey('ShiftLeft', false))

    document.getElementById('ui-root')!.appendChild(this.stickEl)
    document.getElementById('ui-root')!.appendChild(this.buttons)

    this.stickEl.addEventListener('touchstart', e => this.onStickStart(e), { passive: false })
    window.addEventListener('touchmove', e => this.onTouchMove(e), { passive: false })
    window.addEventListener('touchend', e => this.onTouchEnd(e), { passive: false })
  }

  private onStickStart(e: TouchEvent): void {
    e.preventDefault()
    const t = e.changedTouches[0]
    this.joystickActive = true
    this.joystickId = t.identifier
    this.stickCenter.x = t.clientX
    this.stickCenter.y = t.clientY
    this.stickEl.style.left = `${t.clientX}px`
    this.stickEl.style.top = `${t.clientY}px`
    this.stickEl.style.opacity = '1'
    this.knobEl.style.transform = 'translate(-50%, -50%)'
  }

  private onTouchMove(e: TouchEvent): void {
    for (const t of e.changedTouches) {
      if (this.joystickActive && t.identifier === this.joystickId) {
        let dx = t.clientX - this.stickCenter.x
        let dy = t.clientY - this.stickCenter.y
        const len = Math.hypot(dx, dy)
        if (len > JOY_RADIUS) {
          dx = (dx / len) * JOY_RADIUS
          dy = (dy / len) * JOY_RADIUS
        }
        this.stickKnob.x = dx / JOY_RADIUS
        this.stickKnob.y = dy / JOY_RADIUS
        this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
        this.updateKeys()
      } else if (this.lookId === t.identifier) {
        this.input.addMouseDelta(t.clientX - this.lookX, t.clientY - this.lookY)
        this.lookX = t.clientX
        this.lookY = t.clientY
      }
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    for (const t of e.changedTouches) {
      if (this.joystickActive && t.identifier === this.joystickId) {
        this.joystickActive = false
        this.joystickId = -1
        this.stickEl.style.opacity = '0'
        this.input.setVirtualKey('KeyW', false)
        this.input.setVirtualKey('KeyS', false)
        this.input.setVirtualKey('KeyA', false)
        this.input.setVirtualKey('KeyD', false)
      }
      // right-half touch without joystick = look
      if (t.clientX > window.innerWidth / 2 && !this.joystickActive) {
        this.lookId = -1
      }
    }
  }

  private updateKeys(): void {
    const { x, y } = this.stickKnob
    this.input.setVirtualKey('KeyW', y < -0.25)
    this.input.setVirtualKey('KeyS', y > 0.25)
    this.input.setVirtualKey('KeyA', x < -0.25)
    this.input.setVirtualKey('KeyD', x > 0.25)
  }

  dispose(): void {
    this.stickEl.remove()
    this.buttons.remove()
  }
}
