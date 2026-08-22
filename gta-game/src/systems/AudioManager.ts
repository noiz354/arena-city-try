import type { WeaponDef } from '../data/weapons'

/**
 * Web Audio API sound manager (bloodwave audio.js pattern, adapted):
 * - lazy AudioContext init on the first user gesture
 * - procedural SFX (no audio files — sandbox-safe): shots, reload, hit, kill,
 *   pickup, explosion, damage, empty click
 * - looping engine sound whose pitch follows vehicle speed
 * - master gain + mute (M key)
 */
export class AudioManager {
  muted = false
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineOsc: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private engineOn = false
  private ambientGain: GainNode | null = null

  /** Must be called from a user gesture (click/keydown) to unlock audio. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.8
      this.master.connect(this.ctx.destination)
      this.startAmbient()
    } catch {
      this.ctx = null
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05)
    }
  }

  // --- one-shot SFX ---

  playShoot(weapon: WeaponDef): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const dur = weapon.id === 'shotgun' ? 0.18 : 0.09
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2)
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = weapon.id === 'shotgun' ? 900 : weapon.id === 'rifle' ? 1400 : 2200
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.5, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(t)
    src.stop(t + dur)
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol = 0.2): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    osc.frequency.exponentialRampToValueAtTime(freq * 1.4, t + dur)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(vol, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(gain).connect(this.master)
    osc.start(t)
    osc.stop(t + dur)
  }

  playHit(): void {
    this.blip(180, 0.07, 'square', 0.12)
  }

  playKill(): void {
    this.blip(300, 0.12, 'sawtooth', 0.18)
    this.blip(150, 0.18, 'square', 0.15)
  }

  playReload(): void {
    this.blip(500, 0.06, 'square', 0.1)
    setTimeout(() => this.blip(700, 0.06, 'square', 0.1), 120)
  }

  playPickup(): void {
    this.blip(660, 0.09, 'sine', 0.22)
    setTimeout(() => this.blip(990, 0.14, 'sine', 0.22), 90)
  }

  playDamage(): void {
    this.blip(120, 0.22, 'sawtooth', 0.3)
  }

  playEmpty(): void {
    this.blip(900, 0.04, 'square', 0.08)
  }

  playExplosion(): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const dur = 0.7
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 1.5)
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(3000, t)
    filter.frequency.exponentialRampToValueAtTime(120, t + dur)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.9, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
    src.connect(filter).connect(gain).connect(this.master)
    src.start(t)
    src.stop(t + dur)
  }

  playMissionComplete(): void {
    this.blip(523, 0.12, 'sine', 0.2)
    setTimeout(() => this.blip(659, 0.12, 'sine', 0.2), 120)
    setTimeout(() => this.blip(784, 0.24, 'sine', 0.22), 240)
  }

  // --- looping engine ---

  setEngine(active: boolean, speedRatio: number): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    if (active && !this.engineOn) {
      this.engineOsc = ctx.createOscillator()
      this.engineOsc.type = 'sawtooth'
      this.engineOsc.frequency.value = 55
      this.engineFilter = ctx.createBiquadFilter()
      this.engineFilter.type = 'lowpass'
      this.engineFilter.frequency.value = 300
      this.engineGain = ctx.createGain()
      this.engineGain.gain.value = 0
      this.engineOsc.connect(this.engineFilter).connect(this.engineGain).connect(this.master)
      this.engineOsc.start()
      this.engineOn = true
    }
    if (this.engineGain && this.engineOsc && this.engineFilter) {
      const target = active ? 0.05 + speedRatio * 0.09 : 0
      this.engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1)
      this.engineOsc.frequency.setTargetAtTime(50 + speedRatio * 90, ctx.currentTime, 0.1)
      this.engineFilter.frequency.setTargetAtTime(250 + speedRatio * 500, ctx.currentTime, 0.1)
      if (!active && this.engineOn) {
        this.engineOn = false
        // keep nodes alive; gain already ramped to 0
      }
    }
  }

  private startAmbient(): void {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    // soft brown-ish noise bed for city ambience
    const dur = 2
    const buffer = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let last = 0
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1
      last = (last + 0.02 * white) / 1.02
      data[i] = last * 3.5
    }
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.loop = true
    this.ambientGain = ctx.createGain()
    this.ambientGain.gain.value = 0.05
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    src.connect(filter).connect(this.ambientGain).connect(this.master)
    src.start()
  }
}
