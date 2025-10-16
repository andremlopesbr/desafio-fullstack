import React from 'react'
import { useErrorHandler } from '../../hooks/useErrorHandler'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

interface ErrorFallbackProps {
  /** Título do erro */
  title?: string
  /** Mensagem personalizada */
  message?: string
  /** Se deve mostrar o botão de retry */
  showRetry?: boolean
  /** Classes CSS adicionais */
  className?: string
  /** Função personalizada de retry */
  onRetry?: () => void
  /** Se deve mostrar detalhes técnicos do erro */
  showDetails?: boolean
}

/**
 * Componente fallback para tratamento de erros
 * Integrado com o hook useErrorHandler para fornecer experiência consistente
 */
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  title = 'Ops! Algo deu errado',
  message = 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.',
  showRetry = true,
  className = '',
  onRetry,
  showDetails = false
}) => {
  const { error, errorInfo, retry, isRetrying } = useErrorHandler()

  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    } else if (retry) {
      retry()
    }
  }

  const getErrorMessage = () => {
    if (message !== 'Ocorreu um erro inesperado. Tente novamente em alguns instantes.') {
      return message
    }
    return error?.message || message
  }

  return (
    <Card className={`border-red-200 bg-red-50 ${className}`}>
      <div className="text-center p-6">
        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>

        <p className="text-sm text-gray-600 mb-6">{getErrorMessage()}</p>

        {showDetails && errorInfo && (
          <details className="mb-6 text-left">
            <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
              Detalhes técnicos
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded-md text-xs text-gray-800">
              <div>
                <strong>Contexto:</strong> {errorInfo.context || 'Não disponível'}
              </div>
              <div>
                <strong>URL:</strong> {errorInfo.url || 'Não disponível'}
              </div>
              <div>
                <strong>Timestamp:</strong> {errorInfo.timestamp.toLocaleString()}
              </div>
              {errorInfo.stackTrace && (
                <div className="mt-2">
                  <strong>Stack Trace:</strong>
                  <pre className="whitespace-pre-wrap mt-1 text-xs overflow-auto max-h-32">
                    {errorInfo.stackTrace}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        {showRetry && (
          <div className="flex justify-center space-x-3">
            <Button
              onClick={handleRetry}
              disabled={isRetrying}
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isRetrying ? 'Tentando novamente...' : 'Tentar novamente'}
            </Button>

            <Button onClick={() => window.location.reload()} variant="secondary">
              Recarregar página
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
