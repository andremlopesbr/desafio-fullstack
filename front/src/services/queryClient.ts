import { QueryClient } from '@tanstack/react-query'

/**
 * Configuração otimizada do QueryClient para máxima performance
 * Implementa configurações recomendadas para melhorar a experiência do usuário
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache por 5 minutos por padrão
      staleTime: 5 * 60 * 1000, // 5 minutes
      // Manter dados em cache por 10 minutos
      gcTime: 10 * 60 * 1000, // 10 minutes (anteriormente cacheTime)
      // Não refetch on window focus para dados estáticos
      refetchOnWindowFocus: false,
      // Refetch on reconnect para manter dados atualizados
      refetchOnReconnect: true,
      // Retry automático com backoff exponencial
      retry: (failureCount, error: Error & { status?: number }) => {
        // Não retry para erros 4xx (client errors)
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false
        }
        // Retry até 3 vezes para outros erros
        return failureCount < 3
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
    },
    mutations: {
      // Retry para mutations também
      retry: (failureCount, error: Error & { status?: number }) => {
        // Não retry para erros de validação
        if (error?.status === 400 || error?.status === 422) {
          return false
        }
        return failureCount < 2
      },
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 10000)
    }
  }
})
