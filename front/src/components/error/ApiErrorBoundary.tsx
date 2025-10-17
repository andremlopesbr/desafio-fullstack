import React, { ReactNode } from 'react'
import { ErrorBoundary } from './ErrorBoundary'
import { useErrorHandler } from '../../hooks/useErrorHandler'

interface ApiErrorBoundaryProps {
  /** Componentes filhos que serão monitorados por erros de API */
  children: ReactNode
  /** UI personalizada para exibir quando ocorrer um erro de API */
  fallback?: ReactNode
  /** Função personalizada a ser executada no retry */
  onRetry?: () => void
  /** Controla se o botão de refresh é exibido */
  showRefreshButton?: boolean
}

/**
 * Error Boundary especializado para tratamento de erros relacionados a APIs.
 *
 * Este componente integra o ErrorBoundary genérico com o hook useErrorHandler
 * para fornecer uma experiência otimizada para erros de comunicação com APIs,
 * incluindo funcionalidades de retry e tratamento específico de problemas de rede.
 *
 * @param children - Componentes filhos que fazem chamadas de API
 * @param fallback - UI personalizada para erro (opcional)
 * @param onRetry - Função de retry personalizada (opcional)
 * @param showRefreshButton - Exibir botão de tentar novamente (padrão: true)
 * @param context - Contexto para identificar onde o erro ocorreu (padrão: 'API Request')
 *
 * @example
 * ```tsx
 * <ApiErrorBoundary context="Lista de Planos">
 *   <PlanosList />
 * </ApiErrorBoundary>
 * ```
 */
export function ApiErrorBoundary({
  children,
  fallback,
  onRetry,
  showRefreshButton = true
}: ApiErrorBoundaryProps) {
  const { error, setError, clearError, retry, isRetrying } = useErrorHandler()

  /**
    * Callback executado quando um erro é capturado pelo ErrorBoundary.
    * @param error - Erro capturado
    * @param errorInfo - Informações do componente que lançou o erro
    */
  const handleError = React.useCallback(
    (error: Error) => {
      setError(error)
    },
    [setError]
  )

  /**
   * Manipula o evento de retry, executando função personalizada ou padrão.
   */
  const handleRetry = React.useCallback(() => {
    if (onRetry) {
      onRetry()
    } else if (retry) {
      retry()
    }
    clearError()
  }, [onRetry, retry, clearError])

  /**
   * UI padrão para erros de API.
   */
  const defaultFallback = (
    <div className="min-h-[300px] flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Erro de Conexão</h3>
          <p className="text-gray-600 mb-4">
            Não foi possível conectar com o servidor. Verifique sua conexão com a internet e tente
            novamente.
          </p>
          {showRefreshButton && (
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Tentando...' : 'Tentar novamente'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <ErrorBoundary
      fallback={fallback || defaultFallback}
      onError={handleError}
      resetKeys={error?.message ? [error.message] : []}
    >
      {children}
    </ErrorBoundary>
  )
}
