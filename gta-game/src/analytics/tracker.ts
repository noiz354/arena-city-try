/**
 * Lightweight privacy-friendly analytics tracker. No external scripts, no
 * cookies: events are batched into a local queue, persisted to localStorage,
 * and (optionally) beamed to a self-hosted endpoint when one is configured
 * via VITE_ANALYTICS_ENDPOINT. Keeps working offline; never throws.
 *
 * Transport contract (HTTP POST, JSON body): compatible with the standard
 * "events" payload shape used by Plausible/Umami-style collectors, but any
 * endpoint that accepts a JSON array of events works.
 */
export interface AnalyticsEvent {
  name: string
  props?: Record<string, string | number | boolean>
  ts: number
  session: string
}

export interface TrackerOptions {
  endpoint?: string
  siteId?: string
  /** max events kept locally when the endpoint is unreachable */
  maxQueue?: number
  /** events are flushed when the queue reaches this size */
  flushAt?: number
}

const QUEUE_KEY = 'cityrush_analytics_queue'
const SESSION_KEY = 'cityrush_analytics_session'

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export class Tracker {
  readonly enabled: boolean
  private readonly endpoint?: string
  private readonly siteId?: string
  private readonly maxQueue: number
  private readonly flushAt: number
  private readonly session: string
  private queue: AnalyticsEvent[] = []
  private flushing = false

  constructor(options: TrackerOptions = {}) {
    this.endpoint = options.endpoint
    this.siteId = options.siteId
    this.maxQueue = options.maxQueue ?? 200
    this.flushAt = options.flushAt ?? 8
    this.enabled = true

    let session = ''
    try {
      session = typeof localStorage !== 'undefined' ? (localStorage.getItem(SESSION_KEY) ?? '') : ''
    } catch {
      // storage unavailable
    }
    if (!session) {
      session = newSessionId()
      try {
        if (typeof localStorage !== 'undefined') localStorage.setItem(SESSION_KEY, session)
      } catch {
        // ignore
      }
    }
    this.session = session

    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(QUEUE_KEY) : null
      if (raw) {
        const parsed = JSON.parse(raw) as AnalyticsEvent[]
        if (Array.isArray(parsed)) this.queue = parsed.slice(-this.maxQueue)
      }
    } catch {
      this.queue = []
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.flush(true))
    }
  }

  /** Record an event (safe to call anywhere, never throws). */
  track(name: string, props?: AnalyticsEvent['props']): void {
    try {
      this.queue.push({ name, props, ts: Date.now(), session: this.session })
      if (this.queue.length >= this.flushAt) void this.flush()
      this.persist()
    } catch {
      // analytics must never break the game
    }
  }

  get queuedCount(): number {
    return this.queue.length
  }

  get sessionId(): string {
    return this.session
  }

  /**
   * Attempt to send queued events. The queue is only drained after a
   * successful send, so events are never lost while a request is in flight
   * (no race between flush and persist). Returns true when the endpoint was
   * hit or there was nothing to send.
   */
  async flush(unload = false): Promise<boolean> {
    if (this.flushing) return false
    if (this.queue.length === 0) return true
    if (!this.endpoint) return false // local-only mode

    this.flushing = true
    const batch = this.queue.slice(0, this.flushAt * 4)
    try {
      const body = JSON.stringify({
        site: this.siteId,
        events: batch.map(({ name, props, ts, session }) => ({ name, props, ts, session })),
      })
      if (unload) {
        // sendBeacon is fire-and-forget and works during page teardown
        if (typeof navigator !== 'undefined') {
          navigator.sendBeacon?.(this.endpoint, new Blob([body], { type: 'application/json' }))
        }
        this.queue.splice(0, batch.length)
        this.persist()
        return true
      }
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      })
      if (!res.ok) throw new Error(`analytics ${res.status}`)
      this.queue.splice(0, batch.length)
      this.persist()
      return true
    } catch {
      // keep the batch queued (bounded) for the next flush attempt
      if (this.queue.length > this.maxQueue) {
        this.queue = this.queue.slice(-this.maxQueue)
      }
      this.persist()
      return false
    } finally {
      this.flushing = false
    }
  }

  private persist(): void {
    try {
      const trimmed = this.queue.slice(-this.maxQueue)
      if (typeof localStorage !== 'undefined') localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed))
    } catch {
      // ignore
    }
  }

  clearLocal(): void {
    this.queue = []
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(QUEUE_KEY)
        localStorage.removeItem(SESSION_KEY)
      }
    } catch {
      // ignore
    }
  }
}

/**
 * Singleton tracker configured from build-time env vars:
 *   VITE_ANALYTICS_ENDPOINT  → POST destination for beamed events
 *   VITE_ANALYTICS_SITE      → site id passed in the payload
 */
export function createTracker(): Tracker {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined
  const siteId = import.meta.env.VITE_ANALYTICS_SITE as string | undefined
  return new Tracker({ endpoint, siteId })
}
