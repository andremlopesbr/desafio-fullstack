import { useState, useCallback } from 'react'
import { useErrorLogger } from '../services/errorLogger'

/**
 * Hook para tratamento de erros com estado local e logging profissional
 * Mantém compatibilidade com código existente e adiciona funcionalidades avançadas
 */
export const useErrorHandler = () => {
  const [error, setError] = useState<{ message: string; code?: string } | null>(null)
  const [retry, setRetry] = useState<(() => void) | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)
  const { logError } = useErrorLogger()

  const clearError = useCallback(() => {
    setError(null)
    setRetry(null)
    setIsRetrying(false)
  }, [])

  const handleError = useCallback(
    (
      error: Error | string | unknown,
      context?: {
        component?: string
        action?: string
        severity?: 'low' | 'medium' | 'high' | 'critical'
        additionalData?: Record<string, unknown>
      }
    ) => {
      const {
        component = 'UnknownComponent',
        action = 'unknown',
        severity = 'medium',
        additionalData = {}
      } = context || {}

      // Converter erro para string se necessário
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
            ? error
            : 'Erro desconhecido'

      // Define o erro no estado local
      setError({ message: errorMessage })

      // Log estruturado profissional
      logError(errorMessage, severity, {
        component,
        action,
        additionalData: {
          originalError: error,
          timestamp: new Date().toISOString(),
          ...additionalData
        }
      })

      return errorMessage
    },
    [logError]
  )

  const handleApiError = useCallback(
    (error: unknown, apiEndpoint?: string, additionalContext?: Record<string, unknown>) => {
      return handleError(error, {
        component: 'API',
        action: 'request',
        severity: 'high',
        additionalData: {
          apiEndpoint,
          errorType: 'api_error',
          ...additionalContext
        }
      })
    },
    [handleError]
  )

  const handleBusinessLogicError = useCallback(
    (error: unknown, operation?: string, additionalContext?: Record<string, unknown>) => {
      return handleError(error, {
        component: 'BusinessLogic',
        action: operation || 'unknown',
        severity: 'medium',
        additionalData: {
          errorType: 'business_logic_error',
          ...additionalContext
        }
      })
    },
    [handleError]
  )

  const executeWithErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: {
        component?: string
        action?: string
        severity?: 'low' | 'medium' | 'high' | 'critical'
      }
    ): Promise<T | null> => {
      try {
        clearError()
        return await operation()
      } catch (error) {
        handleError(error, context)
        return null
      }
    },
    [clearError, handleError]
  )

  const retryOperation = useCallback(async () => {
    if (!retry || isRetrying) return

    setIsRetrying(true)
    try {
      await retry()
      clearError()
    } catch (error) {
      handleError(error, { component: 'RetryOperation', action: 'retry' })
    } finally {
      setIsRetrying(false)
    }
  }, [retry, isRetrying, clearError, handleError])

  return {
    error,
    setError,
    retry,
    setRetry,
    isRetrying,
    clearError,
    handleError,
    handleApiError,
    handleBusinessLogicError,
    executeWithErrorHandling,
    retryOperation,
    logError
  }
}

export default useErrorHandler
