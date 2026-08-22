import type { Game } from '../game/Game'

/**
 * Minimal debug overlay: FPS + camera position. Will be replaced by the full
 * game HUD (health, ammo, minimap) in later phases. CSS is bundled inline by
 * Vite so the sandbox preview needs no external resources.
 */
export class HUD {
  private readonly el: HTMLDivElement
  private fps = 0
  private frames = 0
  private lastSecond = performance.now()

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `
      <div class="hud__title">CITY RUSH — Phase 0 Scaffold</div>
      <div class="hud__stats">
        <span id="hud-fps">FPS: --</span>
        <span id="hud-pos">POS: --</span>
      </div>
      <div class="hud__hint">Drag to orbit · Scroll to zoom · Right-drag to pan</div>
    `
    document.getElementById('ui-root')!.appendChild(this.el)
  }

  update(_delta: number, game: Game): void {
    this.frames++
    const now = performance.now()
    if (now - this.lastSecond >= 1000) {
      this.fps = this.frames
      this.frames = 0
      this.lastSecond = now

      const p = game.camera.position
      document.getElementById('hud-fps')!.textContent = `FPS: ${this.fps}`
      document.getElementById('hud-pos')!.textContent =
        `POS: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
    }
  }
}
