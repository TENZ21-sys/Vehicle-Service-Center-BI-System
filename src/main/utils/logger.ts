import * as fs from 'fs'
import * as path from 'path'

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

class Logger {
  private logFilePath: string | null = null
  private minLevel: LogLevel = 'INFO'

  private readonly levelWeights: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  }

  public init(logDir: string, minLevel: LogLevel = 'INFO'): void {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }
    this.logFilePath = path.join(logDir, 'app.log')
    this.minLevel = minLevel
  }

  public debug(message: string, context?: unknown): void {
    this.log('DEBUG', message, context)
  }

  public info(message: string, context?: unknown): void {
    this.log('INFO', message, context)
  }

  public warn(message: string, context?: unknown): void {
    this.log('WARN', message, context)
  }

  public error(message: string, context?: unknown): void {
    this.log('ERROR', message, context)
  }

  private log(level: LogLevel, message: string, context?: unknown): void {
    if (this.levelWeights[level] < this.levelWeights[this.minLevel]) {
      return
    }

    const timestamp = new Date().toISOString()
    const ctxString = context ? ` | ${typeof context === 'object' ? JSON.stringify(context) : context}` : ''
    const line = `[${timestamp}] [${level}] ${message}${ctxString}\n`

    // Output to console in development
    if (process.env.NODE_ENV !== 'production') {
      const fn = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log
      fn(line.trim())
    }

    // Append to file
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, line, 'utf8')
      } catch (err) {
        console.error('Failed to write log file:', err)
      }
    }
  }
}

export const logger = new Logger()
