/**
 * Minimal structured logger with levels + prefixing. Sandbox-safe: no external
 * deps, output goes to console with optional hooking into the error handler.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  level: LogLevel
  system: string
  message: string
  at: number // performance.now() timestamp
  data?: unknown
}

type LogSink = (entry: LogEntry) => void

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

class LoggerImpl {
  minLevel: LogLevel = 'info'
  private sinks = new Set<LogSink>()

  setLevel(level: LogLevel): void {
    this.minLevel = level
  }

  addSink(sink: LogSink): void {
    this.sinks.add(sink)
  }

  private emit(level: LogLevel, system: string, message: string, data?: unknown): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.minLevel]) return
    const entry: LogEntry = { level, system, message, at: performance.now(), data }
    const prefix = `[${level.toUpperCase()}] [${system}]`
    if (data !== undefined) {
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](prefix, message, data)
    } else {
      // eslint-disable-next-line no-console
      console[level === 'debug' ? 'log' : level](prefix, message)
    }
    for (const sink of this.sinks) sink(entry)
  }

  debug(system: string, msg: string, data?: unknown): void { this.emit('debug', system, msg, data) }
  info(system: string, msg: string, data?: unknown): void { this.emit('info', system, msg, data) }
  warn(system: string, msg: string, data?: unknown): void { this.emit('warn', system, msg, data) }
  error(system: string, msg: string, data?: unknown): void { this.emit('error', system, msg, data) }
}

export const logger = new LoggerImpl()
