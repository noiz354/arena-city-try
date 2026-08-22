import type { Tracker } from './tracker'

/**
 * Gameplay telemetry: maps game events to analytics events, plus an FPS
 * sampler that reports frame-rate buckets so performance regressions are
 * visible over time. Wired from main.ts via the Game's existing hooks.
 */
export class GameTelemetry {
  private fpsFrames = 0
  private fpsWindow = 0
  private readonly fpsInterval = 10 // seconds between FPS reports
  private lastErrorAt = 0

  constructor(private readonly tracker: Tracker) {}

  // --- session lifecycle ---

  sessionStart(): void {
    this.tracker.track('session_start', {
      ua: navigator.userAgent.slice(0, 80),
      lang: navigator.language,
      dpr: window.devicePixelRatio ?? 1,
      w: window.innerWidth,
      h: window.innerHeight,
    })
  }

  // --- gameplay events (wired to existing hooks) ---

  playerDamaged(): void {
    this.tracker.track('player_damaged')
  }

  kill(kind: 'enemy' | 'civilian', weapon: string): void {
    this.tracker.track('kill', { kind, weapon })
  }

  weaponAcquired(id: string): void {
    this.tracker.track('weapon_acquired', { weapon: id })
  }

  ammoPickup(): void {
    this.tracker.track('ammo_pickup')
  }

  missionStart(id: string, name: string): void {
    this.tracker.track('mission_start', { mission: id, name })
  }

  missionComplete(id: string, name: string, reward: number): void {
    this.tracker.track('mission_complete', { mission: id, name, reward })
  }

  vehicleEnter(): void {
    this.tracker.track('vehicle_enter')
  }

  vehicleExit(): void {
    this.tracker.track('vehicle_exit')
  }

  wantedChanged(stars: number): void {
    this.tracker.track('wanted_changed', { stars })
  }

  playerDied(): void {
    this.tracker.track('player_died')
  }

  playerRespawn(): void {
    this.tracker.track('player_respawn')
  }

  /** Global error handler sink — throttle duplicate bursts. */
  error(type: string, message: string): void {
    const now = performance.now()
    if (now - this.lastErrorAt < 2000) return // max one error per 2s
    this.lastErrorAt = now
    this.tracker.track('error', { type, message: message.slice(0, 160) })
  }

  // --- FPS sampling (call every frame) ---

  frame(): void {
    this.fpsFrames++
  }

  update(dt: number): void {
    this.fpsWindow += dt
    if (this.fpsWindow < this.fpsInterval) return
    const fps = Math.round(this.fpsFrames / this.fpsWindow)
    this.tracker.track('fps_report', { fps, interval: Math.round(this.fpsWindow) })
    this.fpsFrames = 0
    this.fpsWindow = 0
  }

  /** Track one-off game state snapshots on demand (pause menu / end). */
  snapshot(stats: Record<string, string | number | boolean>): void {
    this.tracker.track('snapshot', stats)
  }
}
