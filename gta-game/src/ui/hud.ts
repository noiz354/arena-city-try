import type { Game } from '../game/Game'

/**
 * Game HUD: health bar, ammo, weapon name, reload bar, crosshair, damage
 * vignette, hit indicator, enemy counter, stamina, driving speed/health, and
 * contextual prompts. CSS is bundled inline by Vite (sandbox-safe, no CDN).
 */
export class HUD {
  private readonly el: HTMLDivElement
  private fps = 0
  private frames = 0
  private lastSecond = performance.now()
  private damageFlash = 0
  private hitFlash = 0
  private pickupFlash = 0

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `
      <div class="hud__title">CITY RUSH — Phase 4: Combat & Weapons</div>
      <div class="hud__stats">
        <span class="hud__health"><span id="hud-health-fill" class="hud__health-fill"></span></span>
        <span id="hud-fps">FPS: --</span>
        <span id="hud-pos">POS: --</span>
        <span id="hud-chunk">CHUNK: --</span>
        <span class="hud__stamina"><span id="hud-stamina-fill" class="hud__stamina-fill"></span></span>
        <span id="hud-thugs">THUGS: --</span>
        <span id="hud-speed" class="hud__speed" style="display:none">0 km/h</span>
        <span class="hud__vhealth" style="display:none"><span id="hud-vhealth-fill" class="hud__vhealth-fill"></span></span>
      </div>

      <div id="hud-ammo" class="hud__ammo" style="display:none">
        <span id="hud-weapon-name" class="hud__weapon-name">PISTOL</span>
        <span id="hud-ammo-value">12</span><span id="hud-ammo-reserve" class="hud__ammo-reserve"> / 60</span>
        <div class="hud__reload"><span id="hud-reload-fill" class="hud__reload-fill"></span></div>
      </div>

      <div id="hud-crosshair" class="hud__crosshair" style="display:none"></div>
      <div id="hud-vignette" class="hud__vignette"></div>
      <div id="hud-hit" class="hud__hit"></div>
      <div id="hud-pickup" class="hud__pickup"></div>
      <div id="hud-prompt" class="hud__prompt"></div>
      <div class="hud__hint" id="hud-hint">WASD move · LMB shoot · 1-4 weapons · R reload · E enter car · LMB-drag look · WHEEL zoom</div>
    `
    document.getElementById('ui-root')!.appendChild(this.el)
  }

  showDamage(): void {
    this.damageFlash = 0.5
  }

  showHit(): void {
    this.hitFlash = 0.12
  }

  showPickup(text: string): void {
    const el = document.getElementById('hud-pickup')!
    el.textContent = text
    this.pickupFlash = 1.2
  }

  update(delta: number, game: Game): void {
    const driving = game.mode === 'driving'

    // health bar (player)
    const healthFill = document.getElementById('hud-health-fill')!
    const hpPct = game.player.health / game.player.maxHealth
    healthFill.style.width = `${hpPct * 100}%`
    healthFill.style.background =
      hpPct > 0.5 ? 'linear-gradient(90deg,#22c55e,#86efac)' : hpPct > 0.25 ? 'linear-gradient(90deg,#f59e0b,#fcd34d)' : 'linear-gradient(90deg,#ef4444,#f87171)'

    // stamina (foot only)
    const stamina = document.querySelector('.hud__stamina') as HTMLElement
    document.getElementById('hud-stamina-fill')!.style.width = `${game.player.stamina}%`
    stamina.style.display = driving ? 'none' : 'inline-block'

    // combat HUD visibility (foot only)
    const ammoEl = document.getElementById('hud-ammo')!
    const crossEl = document.getElementById('hud-crosshair')!
    const showCombat = !driving && game.player.health > 0
    ammoEl.style.display = showCombat ? 'block' : 'none'
    crossEl.style.display = showCombat ? 'block' : 'none'

    if (showCombat) {
      const w = game.weapons
      document.getElementById('hud-weapon-name')!.textContent = w.currentDef.name
      document.getElementById('hud-ammo-value')!.textContent = `${w.mag}`
      document.getElementById('hud-ammo-reserve')!.textContent = ` / ${w.reserve}`
      const reloadFill = document.getElementById('hud-reload-fill')!
      const reloadBox = reloadFill.parentElement!
      reloadBox.style.opacity = w.reloading ? '1' : '0'
      reloadFill.style.width = `${w.reloadProgress * 100}%`
    }

    // driving HUD
    const speedEl = document.getElementById('hud-speed')!
    const vhealthEl = document.querySelector('.hud__vhealth') as HTMLElement
    speedEl.style.display = driving ? 'inline-block' : 'none'
    vhealthEl.style.display = driving ? 'inline-block' : 'none'
    if (driving && game.vehicle) {
      speedEl.textContent = `${game.vehicle.speedKmh.toFixed(0)} km/h`
      const fill = document.getElementById('hud-vhealth-fill')!
      fill.style.width = `${game.vehicle.health}%`
      fill.style.background = game.vehicle.wrecked ? '#e74c3c' : '#2ecc71'
    }

    // thugs remaining
    document.getElementById('hud-thugs')!.textContent = `THUGS: ${game.enemies.aliveCount}`

    // prompts
    const prompt = document.getElementById('hud-prompt')!
    if (game.respawnTimer > 0) {
      prompt.textContent = 'YOU DIED — respawning…'
    } else if (!driving && game.nearestVehicle) {
      prompt.textContent = game.nearestVehicle.wrecked
        ? 'WRECKED — cannot enter'
        : `[E] Enter ${game.nearestVehicle.config.name}`
    } else {
      prompt.textContent = ''
    }

    // damage vignette + hit marker + pickup toast
    this.damageFlash = Math.max(0, this.damageFlash - delta)
    this.hitFlash = Math.max(0, this.hitFlash - delta)
    this.pickupFlash = Math.max(0, this.pickupFlash - delta)
    document.getElementById('hud-vignette')!.style.opacity = String(Math.min(1, this.damageFlash * 2))
    document.getElementById('hud-hit')!.style.opacity = this.hitFlash > 0 ? '1' : '0'
    document.getElementById('hud-pickup')!.style.opacity = String(Math.min(1, this.pickupFlash * 1.5))
    if (this.pickupFlash <= 0) document.getElementById('hud-pickup')!.textContent = ''

    // low-health pulse
    const vig = document.getElementById('hud-vignette')!
    if (hpPct < 0.3 && hpPct > 0 && game.player.health > 0) {
      const pulse = (Math.sin(performance.now() * 0.004) * 0.5 + 0.5) * 0.35
      vig.style.opacity = String(Math.max(parseFloat(vig.style.opacity), pulse))
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
      document.getElementById('hud-pos')!.textContent = `POS: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
      document.getElementById('hud-chunk')!.textContent = `CHUNK ${cx},${cz} · ACTIVE ${game.world.chunks.activeCount}`
    }
  }
}
