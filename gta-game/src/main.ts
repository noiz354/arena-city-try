import './ui/style.css'
import { Game } from './game/Game'
import { HUD } from './ui/hud'

const container = document.getElementById('app')!

const game = new Game({ container })
game.start()

const hud = new HUD()
game.onUpdate(delta => hud.update(delta, game))

// HUD event wiring
game.onPlayerDamaged = () => hud.showDamage()
game.onWeaponHit = () => hud.showHit()
game.onPickup = msg => hud.showPickup(msg)
game.onDialogue = line => hud.showDialogue(line)

// Expose for debugging from the browser console
;(window as unknown as { game: Game }).game = game
