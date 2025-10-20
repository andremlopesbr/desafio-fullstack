import React from 'react'
import { ErrorBoundary } from './ErrorBoundary'

interface ContextualErrorBoundaryProps {
  children: React.ReactNode
  context: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  showTechnicalDetails?: boolean
  resetKeys?: Array<string | number>
}

/**
 * Error Boundary específico para operações de pagamento
 */
export const PaymentErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    context="Pagamento"
    severity="high"
    showTechnicalDetails={false}
    retryTimeout={2000}
    resetKeys={['payment']}
    fallback={
      <div className="min-h-[300px] flex items-center justify-center bg-red-50 border border-red-200 rounded-lg">
        <div className="text-center p-6">
          <div className="w-12 h-12 mx-auto mb-3 bg-red-100 rounded-full flex items-center justify-center">
            <span className="text-red-600 text-xl">💳</span>
          </div>
          <h3 className="font-semibold text-red-800 mb-2">Erro no Pagamento</h3>
          <p className="text-red-600 text-sm mb-3">
            Houve um problema ao processar seu pagamento. Seus dados estão seguros.
          </p>
          <p className="text-xs text-red-500">
            Tente novamente em alguns instantes ou entre em contato conosco.
          </p>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

/**
 * Error Boundary específico para listagens e tabelas
 */
export const DataErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    context="Dados"
    severity="medium"
    showTechnicalDetails={false}
    retryTimeout={1000}
    fallback={
      <div className="text-center py-8 px-4">
        <div className="w-10 h-10 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-gray-500">📊</span>
        </div>
        <p className="text-gray-600 mb-3">Erro ao carregar dados</p>
        <p className="text-sm text-gray-500">
          Não foi possível carregar as informações. Verifique sua conexão e tente novamente.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

/**
 * Error Boundary específico para formulários
 */
export const FormErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    context="Formulário"
    severity="medium"
    showTechnicalDetails={false}
    retryTimeout={1500}
    fallback={
      <div className="text-center py-6 px-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
        <div className="w-10 h-10 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
          <span className="text-gray-500">📝</span>
        </div>
        <p className="text-gray-600 mb-2">Erro no formulário</p>
        <p className="text-sm text-gray-500">
          O formulário encontrou um problema. Seus dados foram preservados.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)

/**
 * Error Boundary genérico customizável
 */
export const ContextualErrorBoundary: React.FC<ContextualErrorBoundaryProps> = ({
  children,
  context,
  severity = 'medium',
  showTechnicalDetails = false,
  resetKeys
}) => (
  <ErrorBoundary
    context={context}
    severity={severity}
    showTechnicalDetails={showTechnicalDetails}
    resetKeys={resetKeys}
  >
    {children}
  </ErrorBoundary>
)

/**
 * Error Boundary para toda a aplicação (nível mais alto)
 */
export const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary
    context="Aplicação"
    severity="critical"
    showTechnicalDetails={true}
    retryTimeout={3000}
    fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Sistema Indisponível</h1>
            <p className="text-gray-600 mb-6">
              Ocorreu um erro crítico na aplicação. Nossa equipe técnica foi notificada
              automaticamente.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Recarregar Aplicação
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
              >
                Ir para Página Inicial
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
)
