import './ui/style.css'
import { Game } from './game/Game'
import { HUD } from './ui/hud'

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

const game = new Game({ container })
game.onUpdate(() => hideLoading())
game.start()

const hud = new HUD()
game.onUpdate(delta => hud.update(delta, game))

// HUD event wiring
game.onPlayerDamaged = () => hud.showDamage()
game.onWeaponHit = () => hud.showHit()
game.onPickup = msg => hud.showPickup(msg)
game.onDialogue = line => hud.showDialogue(line)
game.onObjective = text => hud.setObjective(text)

// Expose for debugging from the browser console
;(window as unknown as { game: Game }).game = game
