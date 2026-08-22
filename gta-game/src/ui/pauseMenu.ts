export interface PauseMenuCallbacks {
  onResume: () => void
  onRestart: () => void
  onToggleMute: () => void
  isMuted: () => boolean
  stats: () => string
}

/**
 * Pause overlay (ESC): resume, mute toggle, restart (clears save), current
 * stats, and a control reference. Purely DOM/CSS — no external resources.
 */
export class PauseMenu {
  private readonly el: HTMLDivElement
  private readonly muteBtn: HTMLButtonElement
  private readonly statsEl: HTMLDivElement
  private visible = false

  constructor(private readonly cb: PauseMenuCallbacks) {
    this.el = document.createElement('div')
    this.el.className = 'pause'
    this.el.style.display = 'none'

    this.statsEl = document.createElement('div')
    this.statsEl.className = 'pause__stats'

    const btn = (label: string, cls: string, onClick: () => void): HTMLButtonElement => {
      const b = document.createElement('button')
      b.className = `pause__btn ${cls}`
      b.textContent = label
      b.addEventListener('click', onClick)
      return b
    }

    const resume = btn('▶ RESUME', '', this.cb.onResume)
    this.muteBtn = btn('', 'pause__mute', () => {
      this.cb.onToggleMute()
      this.refreshMute()
    })
    const restart = btn('↺ RESTART', 'pause__danger', this.cb.onRestart)

    const controls = document.createElement('div')
    controls.className = 'pause__controls'
    controls.innerHTML =
      '<b>CONTROLS</b><br>' +
      'WASD — move / drive<br>' +
      'LMB drag — look · LMB click — shoot<br>' +
      '1–4 — weapons · R — reload<br>' +
      'E — enter car / mission · SHIFT — sprint<br>' +
      'SPACE — jump · M — mute · ESC — pause'

    this.el.innerHTML = '<h1 class="pause__title">PAUSED</h1>'
    this.el.appendChild(this.statsEl)
    this.el.appendChild(resume)
    this.el.appendChild(this.muteBtn)
    this.el.appendChild(restart)
    this.el.appendChild(controls)
    document.getElementById('ui-root')!.appendChild(this.el)
  }

  setVisible(visible: boolean): void {
    this.visible = visible
    this.el.style.display = visible ? 'flex' : 'none'
    if (visible) {
      this.statsEl.textContent = this.cb.stats()
      this.refreshMute()
    }
  }

  get isVisible(): boolean {
    return this.visible
  }

  private refreshMute(): void {
    this.muteBtn.textContent = this.cb.isMuted() ? '🔇 SOUND: OFF' : '🔊 SOUND: ON'
  }
}
