import { useCallback, useState } from 'react'

export interface ErrorInfo {
  /** Objeto de erro capturado */
  error: Error
  /** Timestamp quando o erro ocorreu */
  timestamp: Date
  /** Contexto adicional sobre onde o erro ocorreu */
  context?: string
  /** ID do usuário autenticado (se disponível) */
  userId?: string
  /** URL onde o erro ocorreu */
  url?: string
  /** User agent do navegador */
  userAgent?: string
  /** Stack trace do erro */
  stackTrace?: string
}

export interface UseErrorHandlerReturn {
  /** Erro atual capturado */
  error: Error | null
  /** Informações detalhadas do erro */
  errorInfo: ErrorInfo | null
  /** Função para definir um erro */
  setError: (error: Error | string, context?: string) => void
  /** Função para limpar o erro */
  clearError: () => void
  /** Função para registrar erro (apenas log, sem alterar estado) */
  logError: (error: Error | string, context?: string) => ErrorInfo
  /** Função de retry configurada */
  retry: (() => void) | null
  /** Função para configurar função de retry */
  setRetry: (retryFn: (() => void) | null) => void
  /** Estado de retry em andamento */
  isRetrying: boolean
  /** Função para definir estado de retry */
  setRetrying: (retrying: boolean) => void
}

/**
 * Hook personalizado para tratamento centralizado de erros na aplicação.
 *
 * Este hook fornece funcionalidades para capturar, registrar e gerenciar erros,
 * integrando-se com o contexto de autenticação para incluir informações do usuário.
 * Pode ser integrado com serviços de monitoramento de erro como Sentry ou LogRocket.
 *
 * @returns Objeto com métodos e estados para gerenciamento de erros
 *
 * @example
 * ```tsx
 * function MeuComponente() {
 *   const { error, setError, clearError, retry, setRetry } = useErrorHandler();
 *
 *   const handleApiCall = async () => {
 *     try {
 *       await api.chamadaProblematica();
 *     } catch (err) {
 *       setError(err, 'API Call');
 *       setRetry(() => handleApiCall);
 *     }
 *   };
 *
 *   if (error) {
 *     return (
 *       <div>
 *         <p>Erro: {error.message}</p>
 *         <button onClick={retry}>Tentar novamente</button>
 *       </div>
 *     );
 *   }
 *
 *   return <div>Componente funcionando normalmente</div>;
 * }
 * ```
 */
export function useErrorHandler(): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = useState<ErrorInfo | null>(null)
  const [retry, setRetryState] = useState<(() => void) | null>(null)
  const [isRetrying, setRetryingState] = useState(false)

  /**
   * Define um erro e registra suas informações detalhadas.
   * @param error - Erro a ser registrado (Error ou string)
   * @param context - Contexto adicional sobre onde o erro ocorreu
   */
  const setError = useCallback((error: Error | string, context?: string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error

    setErrorState(errorObj)

    const info: ErrorInfo = {
      error: errorObj,
      timestamp: new Date(),
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace: errorObj.stack
    }

    setErrorInfo(info)
  }, [])

  /**
   * Limpa o estado de erro e informações associadas.
   */
  const clearError = useCallback(() => {
    setErrorState(null)
    setErrorInfo(null)
    setRetryState(null)
    setRetryingState(false)
  }, [])

  /**
   * Registra um erro apenas para logging, sem alterar o estado.
   * @param error - Erro a ser registrado
   * @param context - Contexto adicional
   * @returns Informações detalhadas do erro registrado
   */
  const logError = useCallback((error: Error | string, context?: string): ErrorInfo => {
    const errorObj = typeof error === 'string' ? new Error(error) : error

    const info: ErrorInfo = {
      error: errorObj,
      timestamp: new Date(),
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      stackTrace: errorObj.stack
    }
    return info
  }, [])

  /**
   * Configura uma função de retry para o erro atual.
   * @param retryFn - Função a ser executada no retry
   */
  const setRetry = useCallback((retryFn: (() => void) | null) => {
    setRetryState(retryFn)
  }, [])

  /**
   * Define o estado de retry em andamento.
   * @param retrying - Se está executando retry
   */
  const setRetrying = useCallback((retrying: boolean) => {
    setRetryingState(retrying)
  }, [])

  return {
    error,
    errorInfo,
    setError,
    clearError,
    logError,
    retry,
    setRetry,
    isRetrying,
    setRetrying
  }
}
