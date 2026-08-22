import { logger } from './logger'

export interface ErrorReport {
  type: 'error' | 'rejection' | 'webgl'
  message: string
  source?: string
  lineno?: number
  colno?: number
  stack?: string
  at: number
}

type ErrorReporter = (report: ErrorReport) => void

interface ErrorHandlerOptions {
  /** Called for every captured error (e.g. analytics sink). */
  onReport?: ErrorReporter
  /** Show a developer overlay with the stack trace (default: only in dev). */
  overlay?: boolean
}

/**
 * Global error handling:
 * - window.onerror + unhandledrejection capture
 * - WebGL context loss detection (recovers by showing a reload prompt)
 * - structured reports forwarded to any sink (logger + analytics)
 * - optional dev overlay with the stack
 *
 * Called once from main.ts before the game boots so even constructor errors
 * are caught. Safe no-op outside a browser (headless tests).
 */
export function initErrorHandling(options: ErrorHandlerOptions = {}): void {
  if (typeof window === 'undefined') return

  const report = (r: ErrorReport): void => {
    logger.error('global', r.message, { type: r.type, stack: r.stack })
    options.onReport?.(r)
    if (options.overlay ?? isDev()) showOverlay(r)
  }

  window.addEventListener('error', (e) => {
    report({
      type: 'error',
      message: e.message || 'Unknown error',
      source: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error?.stack,
      at: performance.now(),
    })
  })

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason as Error | undefined
    report({
      type: 'rejection',
      message: reason?.message ?? String(e.reason),
      stack: reason?.stack,
      at: performance.now(),
    })
  })

  // WebGL context loss → tell the player (reload restores it)
  const canvas = document.querySelector('canvas')
  canvas?.addEventListener('webglcontextlost', (e) => {
    e.preventDefault()
    report({ type: 'webgl', message: 'WebGL context lost — reloading the game is required', at: performance.now() })
    const overlay = document.createElement('div')
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:999;background:#0b1026;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:Arial,sans-serif;gap:14px'
    overlay.innerHTML = '<h2 style="margin:0">Graphics context lost</h2><p style="margin:0;opacity:.8">The GPU context crashed. Please reload the page.</p><button id="err-reload" style="padding:10px 22px;font-size:15px;cursor:pointer">Reload</button>'
    document.body.appendChild(overlay)
    document.getElementById('err-reload')!.addEventListener('click', () => window.location.reload())
  })
}

function isDev(): boolean {
  return import.meta.env.DEV
}

/** Friendly dev overlay with the latest error + stack. */
let overlayTimer = 0
function showOverlay(r: ErrorReport): void {
  const id = 'error-overlay'
  let el = document.getElementById(id) as HTMLDivElement | null
  if (!el) {
    el = document.createElement('div')
    el.id = id
    el.style.cssText =
      'position:fixed;right:14px;bottom:14px;z-index:999;max-width:420px;background:rgba(30,10,10,.95);color:#ffd7d7;border:1px solid #e33;border-radius:10px;padding:12px 16px;font:12px/1.5 monospace;box-shadow:0 4px 20px rgba(0,0,0,.5)'
    document.body.appendChild(el)
  }
  el.innerHTML =
    `<div style="font-weight:700;color:#ff8f8f;margin-bottom:6px">⚠ ${r.type.toUpperCase()}: ${escapeHtml(r.message)}</div>` +
    (r.stack ? `<details><summary>stack</summary><pre style="white-space:pre-wrap;margin:6px 0 0;max-height:160px;overflow:auto">${escapeHtml(r.stack.slice(0, 800))}</pre></details>` : '')
  clearTimeout(overlayTimer)
  overlayTimer = window.setTimeout(() => el?.remove(), 12000)
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
