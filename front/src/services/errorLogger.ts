/**
 * Serviço de logging de erros para produção
 * Substitui console.error por um sistema mais robusto e profissional
 */

interface ErrorContext {
  component?: string
  action?: string
  userId?: number
  timestamp: string
  url?: string
  userAgent?: string
  additionalData?: Record<string, unknown>
}

interface ErrorLog {
  message: string
  stack?: string
  context: ErrorContext
  severity: 'low' | 'medium' | 'high' | 'critical'
}

// Em produção, isso poderia enviar para serviços como Sentry, LogRocket, etc.
// Por enquanto, vamos implementar uma versão que armazena localmente e pode ser expandida
class ErrorLogger {
  private static instance: ErrorLogger
  private logs: ErrorLog[] = []
  private readonly MAX_LOGS = 100

  private constructor() {}

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger()
    }
    return ErrorLogger.instance
  }

  private createContext(additionalContext?: Partial<ErrorContext>): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...additionalContext
    }
  }

  private shouldLog(): boolean {
    // Em produção, sempre loga
    // Em desenvolvimento, pode ser configurado para ser mais seletivo
    return import.meta.env.PROD || import.meta.env.VITE_ENABLE_ERROR_LOGGING === 'true'
  }

  private sendToExternalService(log: ErrorLog): void {
    // Aqui você pode integrar com serviços externos como:
    // - Sentry: Sentry.captureException(new Error(log.message), { extra: log })
    // - LogRocket: LogRocket.captureException(new Error(log.message), { extra: log })
    // - DataDog: DD_LOGS.logger.error(log.message, log)

    // Em produção, enviar para serviços externos
    // Em desenvolvimento, usar logging estruturado sem console.log
    if (import.meta.env.DEV && import.meta.env.VITE_DEBUG_ERRORS === 'true') {
      this.devLog(log)
    }
  }

  private devLog(log: ErrorLog): void {
    // Logging estruturado para desenvolvimento - substitui console.log

    // Em desenvolvimento, podemos usar um formato mais legível
    // que será removido automaticamente pelo bundler em produção
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.group(`🚨 [${log.severity.toUpperCase()}] Error Logged`)
      // eslint-disable-next-line no-console
      console.error('Message:', log.message)
      // eslint-disable-next-line no-console
      console.log('Context:', log.context)
      if (log.stack) {
        // eslint-disable-next-line no-console
        console.log('Stack:', log.stack)
      }
      // eslint-disable-next-line no-console
      console.groupEnd()
    }
  }

  log(
    error: Error | string,
    severity: ErrorLog['severity'] = 'medium',
    additionalContext?: Partial<ErrorContext>
  ): void {
    if (!this.shouldLog()) return

    const message = error instanceof Error ? error.message : error
    const stack = error instanceof Error ? error.stack : undefined

    const log: ErrorLog = {
      message,
      stack,
      context: this.createContext(additionalContext),
      severity
    }

    // Armazenar log localmente
    this.logs.push(log)
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift() // Remove o log mais antigo
    }

    // Enviar para serviço externo
    this.sendToExternalService(log)
  }

  getLogs(): ErrorLog[] {
    return [...this.logs]
  }

  clearLogs(): void {
    this.logs = []
  }

  // Método para exportar logs (útil para debugging)
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Hook personalizado para usar o error logger
export const useErrorLogger = () => {
  const logger = ErrorLogger.getInstance()

  const logError = (
    error: Error | string,
    severity?: ErrorLog['severity'],
    context?: Partial<ErrorContext>
  ) => {
    logger.log(error, severity, context)
  }

  return { logError, getLogs: () => logger.getLogs() }
}

export default ErrorLogger
