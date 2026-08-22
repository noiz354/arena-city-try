import type { InputManager } from '../utils/InputManager'

const JOY_RADIUS = 48

/**
 * Mobile touch controls (shown on touch devices only):
 * - left half: virtual joystick → WASD virtual keys
 * - right half: drag to look (injects mouse deltas into the camera)
 * - buttons: JUMP, SPRINT, E (enter/action), FIRE
 *
 * Touch ids are mapped to roles (joystick / look / button) so multi-touch
 * works. FIRE emits a click on release so semi-auto weapons fire too.
 * All input flows through the shared InputManager.
 */
export class MobileControls {
  readonly active: boolean
  private readonly stickEl: HTMLDivElement
  private readonly knobEl: HTMLDivElement
  private readonly buttons: HTMLDivElement

  private readonly touches = new Map<number, 'joystick' | 'look'>()
  private joystickId = -1
  private lookId = -1
  private readonly stickCenter = { x: 0, y: 0 }
  private readonly stickVec = { x: 0, y: 0 }

  constructor(private readonly input: InputManager) {
    this.active = window.matchMedia?.('(pointer: coarse)').matches ?? false
    if (!this.active) {
      this.stickEl = document.createElement('div')
      this.knobEl = document.createElement('div')
      this.buttons = document.createElement('div')
      return
    }

    // joystick overlay
    this.stickEl = document.createElement('div')
    this.stickEl.className = 'mc-stick'
    this.knobEl = document.createElement('div')
    this.knobEl.className = 'mc-stick-knob'
    this.stickEl.appendChild(this.knobEl)

    // buttons (right side)
    this.buttons = document.createElement('div')
    this.buttons.className = 'mc-buttons'

    const mk = (label: string, cls: string, onDown: () => void, onUp?: () => void) => {
      const b = document.createElement('div')
      b.className = `mc-btn ${cls}`
      b.textContent = label
      b.addEventListener('touchstart', e => {
        e.preventDefault()
        e.stopPropagation()
        onDown()
      }, { passive: false })
      b.addEventListener('touchend', e => {
        e.preventDefault()
        e.stopPropagation()
        onUp?.()
      }, { passive: false })
      b.addEventListener('touchcancel', e => {
        e.preventDefault()
        onUp?.()
      }, { passive: false })
      this.buttons.appendChild(b)
    }

    mk('FIRE', 'mc-fire', () => {
      this.input.setMouseHeld(true)
    }, () => {
      // release fires semi-auto weapons (pistol/shotgun)
      this.input.injectClick()
      this.input.setMouseHeld(false)
    })
    mk('E', 'mc-e', () => this.input.pressVirtualKey('KeyE'))
    mk('⤒', 'mc-jump', () => this.input.pressVirtualKey('Space'))
    mk('RUN', 'mc-sprint', () => this.input.setVirtualKey('ShiftLeft', true), () => this.input.setVirtualKey('ShiftLeft', false))

    document.getElementById('ui-root')!.appendChild(this.stickEl)
    document.getElementById('ui-root')!.appendChild(this.buttons)

    // global touch routing: left half → joystick, right half → look
    window.addEventListener('touchstart', this.boundStart, { passive: false })
    window.addEventListener('touchmove', this.boundMove, { passive: false })
    window.addEventListener('touchend', this.boundEnd, { passive: false })
    window.addEventListener('touchcancel', this.boundEnd, { passive: false })
  }

  private readonly boundStart = (e: TouchEvent): void => this.onTouchStart(e)
  private readonly boundMove = (e: TouchEvent): void => this.onTouchMove(e)
  private readonly boundEnd = (e: TouchEvent): void => this.onTouchEnd(e)

  private onTouchStart(e: TouchEvent): void {
    for (const t of e.changedTouches) {
      // ignore touches that began on a button (they handle themselves)
      const target = t.target as HTMLElement
      if (target.closest('.mc-btn')) continue

      const role = t.clientX < window.innerWidth / 2 ? 'joystick' : 'look'
      this.touches.set(t.identifier, role)
      if (role === 'joystick' && this.joystickId === -1) {
        this.joystickId = t.identifier
        this.stickCenter.x = t.clientX
        this.stickCenter.y = t.clientY
        this.stickEl.style.left = `${t.clientX}px`
        this.stickEl.style.top = `${t.clientY}px`
        this.stickEl.style.opacity = '1'
        this.knobEl.style.transform = 'translate(-50%, -50%)'
        this.stickVec.x = 0
        this.stickVec.y = 0
      } else if (role === 'look' && this.lookId === -1) {
        this.lookId = t.identifier
      }
    }
    e.preventDefault()
  }

  private onTouchMove(e: TouchEvent): void {
    for (const t of e.changedTouches) {
      if (t.identifier === this.joystickId) {
        let dx = t.clientX - this.stickCenter.x
        let dy = t.clientY - this.stickCenter.y
        const len = Math.hypot(dx, dy)
        if (len > JOY_RADIUS) {
          dx = (dx / len) * JOY_RADIUS
          dy = (dy / len) * JOY_RADIUS
        }
        this.stickVec.x = dx / JOY_RADIUS
        this.stickVec.y = dy / JOY_RADIUS
        this.knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
        this.updateKeys()
      } else if (t.identifier === this.lookId) {
        // reuse input.mouseDelta via the manager's accumulator
        const prev = this.lastLook.get(t.identifier)
        if (prev) {
          this.input.addMouseDelta(t.clientX - prev.x, t.clientY - prev.y)
        }
        this.lastLook.set(t.identifier, { x: t.clientX, y: t.clientY })
      }
    }
    e.preventDefault()
  }

  private readonly lastLook = new Map<number, { x: number; y: number }>()

  private onTouchEnd(e: TouchEvent): void {
    for (const t of e.changedTouches) {
      this.lastLook.delete(t.identifier)
      this.touches.delete(t.identifier)
      if (t.identifier === this.joystickId) {
        this.joystickId = -1
        this.stickEl.style.opacity = '0'
        this.stickVec.x = 0
        this.stickVec.y = 0
        this.updateKeys()
        // if a look touch is still active, keep using it
        for (const [id, role] of this.touches) {
          if (role === 'look' && this.lookId === -1) {
            this.lookId = id
            break
          }
        }
      } else if (t.identifier === this.lookId) {
        this.lookId = -1
        // promote another look touch if any remains
        for (const [id, role] of this.touches) {
          if (role === 'look') {
            this.lookId = id
            break
          }
        }
      }
    }
  }

  private updateKeys(): void {
    const { x, y } = this.stickVec
    this.input.setVirtualKey('KeyW', y < -0.25)
    this.input.setVirtualKey('KeyS', y > 0.25)
    this.input.setVirtualKey('KeyA', x < -0.25)
    this.input.setVirtualKey('KeyD', x > 0.25)
  }

  dispose(): void {
    this.stickEl.remove()
    this.buttons.remove()
    window.removeEventListener('touchstart', this.boundStart)
    window.removeEventListener('touchmove', this.boundMove)
    window.removeEventListener('touchend', this.boundEnd)
    window.removeEventListener('touchcancel', this.boundEnd)
  }
}
