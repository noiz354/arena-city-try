import './ui/style.css'
import { Game } from './game/Game'
import { HUD } from './ui/hud'
import { initErrorHandling } from './utils/errors'
import { logger } from './utils/logger'
import { createTracker } from './analytics/tracker'
import { GameTelemetry } from './analytics/gameTelemetry'

// --- global error handling FIRST (catches boot errors too) ---
const tracker = createTracker()
initErrorHandling({
  onReport: r => tracker.track('error', { type: r.type, message: r.message.slice(0, 160) }),
  overlay: import.meta.env.DEV,
})

const container = document.getElementById('app')!

// hide the loading screen on the first rendered frame
const loadingEl = document.getElementById('loading')
let loaded = false
function hideLoading(): void {
  if (loaded || !loadingEl) return
  loaded = true
  loadingEl.style.opacity = '0'
  setTimeout(() => loadingEl.remove(), 700)
}

let game: Game | null = null
try {
  game = new Game({ container })
} catch (err) {
  // fatal boot failure — show a friendly screen instead of a white page
  logger.error('boot', 'failed to create game', err)
  tracker.track('boot_failed', { message: err instanceof Error ? err.message.slice(0, 160) : String(err) })
  const fatal = document.createElement('div')
  fatal.style.cssText =
    'position:fixed;inset:0;z-index:200;background:#0b1026;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;gap:12px;text-align:center;padding:24px'
  fatal.innerHTML =
    '<h1 style="color:#ff8f8f;margin:0">The game failed to start</h1>' +
    `<p style="opacity:.8;margin:0;max-width:520px">${(err instanceof Error ? err.message : String(err)).slice(0, 200)}</p>` +
    '<button id="boot-reload" style="padding:10px 24px;font-size:15px;cursor:pointer">Reload</button>'
  document.body.appendChild(fatal)
  document.getElementById('boot-reload')!.addEventListener('click', () => window.location.reload())
  throw err
}

const telemetry = new GameTelemetry(tracker)
game.onUpdate(delta => {
  hideLoading()
  telemetry.frame()
  telemetry.update(delta)
})

const hud = new HUD()
game.onUpdate(delta => hud.update(delta, game!))

// HUD event wiring
game.onPlayerDamaged = () => {
  hud.showDamage()
  telemetry.playerDamaged()
}
game.onWeaponHit = () => hud.showHit()
game.onPickup = msg => hud.showPickup(msg)
game.onDialogue = line => hud.showDialogue(line)
game.onObjective = text => hud.setObjective(text)

// telemetry wiring via game hooks
game.telemetry = telemetry
telemetry.sessionStart()

// flush analytics when the tab closes
window.addEventListener('pagehide', () => void tracker.flush(true))

// --- start the game loop (was missing — game stuck on loading screen) ---
game.start()

// Expose for debugging from the browser console
;(window as unknown as { game: Game }).game = game
;(window as unknown as { tracker: typeof tracker }).tracker = tracker
