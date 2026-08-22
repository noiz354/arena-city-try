import type { Game } from '../game/Game'

/**
 * Debug overlay: FPS + position + stamina + driving HUD (speed, vehicle health)
 * + contextual prompts. CSS is bundled inline by Vite so the sandbox preview
 * needs no external resources.
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
      <div class="hud__title">CITY RUSH — Phase 3: Vehicles & Driving</div>
      <div class="hud__stats">
        <span id="hud-fps">FPS: --</span>
        <span id="hud-pos">POS: --</span>
        <span id="hud-chunk">CHUNK: --</span>
        <span class="hud__stamina"><span id="hud-stamina-fill" class="hud__stamina-fill"></span></span>
        <span id="hud-speed" class="hud__speed" style="display:none">0 km/h</span>
        <span class="hud__vhealth" style="display:none"><span id="hud-vhealth-fill" class="hud__vhealth-fill"></span></span>
      </div>
      <div id="hud-prompt" class="hud__prompt"></div>
      <div class="hud__hint" id="hud-hint">WASD move · SHIFT sprint · SPACE jump · E enter car · LMB-drag look · WHEEL zoom</div>
    `
    document.getElementById('ui-root')!.appendChild(this.el)
  }

  update(_delta: number, game: Game): void {
    const driving = game.mode === 'driving'

    // stamina bar (on foot only)
    const stamina = document.querySelector('.hud__stamina') as HTMLElement
    const staminaFill = document.getElementById('hud-stamina-fill')!
    stamina.style.display = driving ? 'none' : 'inline-block'
    staminaFill.style.width = `${game.player.stamina}%`

    // speed + vehicle health (driving only)
    const speedEl = document.getElementById('hud-speed')!
    const vhealthEl = document.querySelector('.hud__vhealth') as HTMLElement
    speedEl.style.display = driving ? 'inline-block' : 'none'
    vhealthEl.style.display = driving ? 'inline-block' : 'none'
    if (driving && game.vehicle) {
      speedEl.textContent = `${game.vehicle.speedKmh.toFixed(0)} km/h`
      const fill = document.getElementById('hud-vhealth-fill')!
      fill.style.width = `${game.vehicle.health}%`
      fill.style.background = game.vehicle.wrecked ? '#e74c3c' : '#2ecc71'
      document.getElementById('hud-hint')!.textContent =
        `W/S throttle · A/D steer · E exit car${game.vehicle.wrecked ? ' · VEHICLE WRECKED' : ''}`
    } else {
      document.getElementById('hud-hint')!.textContent =
        'WASD move · SHIFT sprint · SPACE jump · E enter car · LMB-drag look · WHEEL zoom'
    }

    // contextual prompt
    const prompt = document.getElementById('hud-prompt')!
    if (!driving && game.nearestVehicle) {
      prompt.textContent = game.nearestVehicle.wrecked ? 'WRECKED — cannot enter' : `[E] Enter ${game.nearestVehicle.config.name}`
    } else {
      prompt.textContent = ''
    }

    this.frames++
    const now = performance.now()
    if (now - this.lastSecond >= 1000) {
      this.fps = this.frames
      this.frames = 0
      this.lastSecond = now

      const p = driving && game.vehicle ? game.vehicle.position : game.player.position
      const { cx, cz } = game.world.chunks.worldToChunk(p.x, p.z)
      document.getElementById('hud-fps')!.textContent = `FPS: ${this.fps}`
      document.getElementById('hud-pos')!.textContent =
        `POS: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      document.getElementById('hud-chunk')!.textContent =
        `CHUNK ${cx},${cz} · ACTIVE ${game.world.chunks.activeCount}`
    }
  }
}
