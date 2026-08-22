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
  private dialogueTimer = 0
  private dialogueText = ''

  constructor() {
    this.el = document.createElement('div')
    this.el.className = 'hud'
    this.el.innerHTML = `
      <div class="hud__title">CITY RUSH — Phase 6: Missions & Progression</div>
      <div class="hud__stats">
        <span class="hud__health"><span id="hud-health-fill" class="hud__health-fill"></span></span>
        <span id="hud-cash">$0</span>
        <span id="hud-level">LVL 1</span>
        <span id="hud-fps">FPS: --</span>
        <span id="hud-pos">POS: --</span>
        <span class="hud__stamina"><span id="hud-stamina-fill" class="hud__stamina-fill"></span></span>
        <span id="hud-thugs">THUGS: --</span>
        <span id="hud-speed" class="hud__speed" style="display:none">0 km/h</span>
        <span class="hud__vhealth" style="display:none"><span id="hud-vhealth-fill" class="hud__vhealth-fill"></span></span>
      </div>
      <div id="hud-mission" class="hud__mission" style="display:none">
        <div id="hud-mission-name" class="hud__mission-name"></div>
        <div id="hud-mission-obj" class="hud__mission-obj"></div>
      </div>
      <div id="hud-compass" class="hud__compass" style="display:none">
        <span id="hud-compass-dist" class="hud__compass-dist">--m</span>
        <div class="hud__compass-arrow-wrap"><div id="hud-compass-arrow" class="hud__compass-arrow"></div></div>
      </div>

      <div id="hud-ammo" class="hud__ammo" style="display:none">
        <span id="hud-weapon-name" class="hud__weapon-name">PISTOL</span>
        <span id="hud-ammo-value">12</span><span id="hud-ammo-reserve" class="hud__ammo-reserve"> / 60</span>
        <div class="hud__reload"><span id="hud-reload-fill" class="hud__reload-fill"></span></div>
      </div>

      <div id="hud-crosshair" class="hud__crosshair" style="display:none"></div>
      <div id="hud-wanted" class="hud__wanted"></div>
      <div id="hud-vignette" class="hud__vignette"></div>
      <div id="hud-hit" class="hud__hit"></div>
      <div id="hud-pickup" class="hud__pickup"></div>
      <div id="hud-dialogue" class="hud__dialogue"></div>
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

  showDialogue(line: string): void {
    this.dialogueText = line
    this.dialogueTimer = 3.2
  }

  /** Mission objective ticker (persistent until the next objective). */
  objectiveText = ''

  setObjective(text: string): void {
    this.objectiveText = text
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

    // cash + level
    document.getElementById('hud-cash')!.textContent = `$${game.missions.profile.money}`
    document.getElementById('hud-level')!.textContent = `LVL ${game.missions.profile.level}`

    // mission panel + compass
    const missionEl = document.getElementById('hud-mission')!
    const compassEl = document.getElementById('hud-compass')!
    const active = game.missions.active
    missionEl.style.display = active ? 'block' : 'none'
    compassEl.style.display = active && game.missions.waypoint() ? 'block' : 'none'
    if (active) {
      document.getElementById('hud-mission-name')!.textContent = active.def.name
      document.getElementById('hud-mission-obj')!.textContent =
        this.objectiveText || game.missions.objectiveText()
      const wp = game.missions.waypoint()
      if (wp) {
        const p = driving && game.vehicle ? game.vehicle.position : game.player.position
        const d = Math.hypot(wp.x - p.x, wp.z - p.z)
        document.getElementById('hud-compass-dist')!.textContent = `${Math.round(d)}m`
        // compass arrow: angle between camera forward and direction to waypoint
        const camYaw = game.cameraRig.yaw
        const angle = Math.atan2(wp.x - p.x, wp.z - p.z)
        let rel = angle - camYaw
        while (rel > Math.PI) rel -= Math.PI * 2
        while (rel < -Math.PI) rel += Math.PI * 2
        document.getElementById('hud-compass-arrow')!.style.transform = `rotate(${-rel}rad)`
      }
    }

    // wanted stars
    const wantedEl = document.getElementById('hud-wanted')!
    const stars = game.wanted.stars
    wantedEl.textContent = stars > 0 ? 'WANTED ' + '★'.repeat(stars) : ''
    wantedEl.style.opacity = stars > 0 ? '1' : '0'

    // dialogue bubble
    this.dialogueTimer = Math.max(0, this.dialogueTimer - delta)
    const dlg = document.getElementById('hud-dialogue')!
    dlg.textContent = this.dialogueTimer > 0 ? `"${this.dialogueText}"` : ''
    dlg.style.opacity = this.dialogueTimer > 0 ? '1' : '0'

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
      document.getElementById('hud-fps')!.textContent = `FPS: ${this.fps}`
      document.getElementById('hud-pos')!.textContent = `POS: ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}`
    }
  }
}
