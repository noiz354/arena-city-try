import { Box3Helper, Color, Group, type Material } from 'three'
import type { Collidable } from '../game/World'

const REFRESH_INTERVAL = 0.25 // s — throttled so we don't rebuild helpers every frame

/**
 * Debug collider visualizer (the Three.js equivalent of Unity "Gizmos" /
 * Godot "Collision Shapes"). Draws a wireframe box for every active collidable
 * so invisible/solid obstacles become visible. Toggled with F3 (or
 * `window.game.debugColliders()` from the console).
 *
 * This is a DIAGNOSTIC aid, not a gameplay system: it is off by default and
 * reuses Box3Helper per active collider, refreshing on a short throttle so
 * moving colliders (vehicles) track their positions without per-frame churn.
 */
export class ColliderDebug {
  readonly root = new Group()
  enabled = false

  private readonly color = new Color(0x00ff88)
  private helpers: Box3Helper[] = []
  private timer = 0

  constructor() {
    this.root.visible = false
  }

  /** Toggle on/off; returns the new state. */
  toggle(): boolean {
    this.enabled = !this.enabled
    this.root.visible = this.enabled
    if (!this.enabled) this.clear()
    else this.timer = 0 // refresh immediately on enable
    return this.enabled
  }

  /** Throttled refresh against the current active collidable set. */
  update(dt: number, collidables: Collidable[]): void {
    if (!this.enabled) return
    this.timer -= dt
    if (this.timer > 0) return
    this.timer = REFRESH_INTERVAL
    this.rebuild(collidables)
  }

  private rebuild(collidables: Collidable[]): void {
    this.clear()
    for (const c of collidables) {
      const helper = new Box3Helper(c.box, this.color)
      this.helpers.push(helper)
      this.root.add(helper)
    }
  }

  private clear(): void {
    for (const h of this.helpers) {
      this.root.remove(h)
      h.geometry.dispose()
      ;(h.material as Material).dispose()
    }
    this.helpers = []
  }

  dispose(): void {
    this.clear()
  }
}
