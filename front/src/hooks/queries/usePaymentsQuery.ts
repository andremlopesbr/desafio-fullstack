import { useQuery } from '@tanstack/react-query'
import { fetchDataDirect } from '../../utils/apiUtils'
import { Payment } from '../../types/api'

/**
 * Hook personalizado para buscar pagamentos do usuário usando TanStack Query
 * Refatorado para usar fetchData centralizado com AbortController e melhor tratamento de erro
 */
export const usePaymentsQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['payments', userId],
    queryFn: async (): Promise<Payment[]> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar pagamentos')
      }

      const url = `${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`
      return fetchDataDirect<Payment[]>(
        url,
        data => {
          // Transforma dados usando a função utilitária existente
          const extractArrayFromData = <T>(): ((data: unknown) => T[]) => {
            return (data: unknown) => {
              if (data && typeof data === 'object' && 'data' in data) {
                const apiResponse = data as { data: T[] }
                return Array.isArray(apiResponse.data) ? apiResponse.data : []
              }
              if (Array.isArray(data)) {
                return data
              }
              return []
            }
          }
          return extractArrayFromData<Payment>()(data)
        },
        {
          timeout: 10000, // 10 segundos
          retries: 2, // 2 tentativas extras em caso de erro
          retryDelay: 1000 // 1 segundo entre tentativas
        }
      )
    },
    enabled: !!userId, // Só executa se userId estiver presente
    // Cache por 2 minutos para pagamentos (dados dinâmicos)
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Manter em cache por 5 minutos
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Retry automático configurado no queryClient para evitar duplicação
    retry: false // Desabilita retry do React Query pois já tratamos no fetchDataDirect
  })
}
