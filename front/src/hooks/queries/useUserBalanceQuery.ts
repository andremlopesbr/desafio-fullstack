import { useQuery } from '@tanstack/react-query'
import { fetchDataDirect } from '../../utils/apiUtils'

/**
 * Hook personalizado para buscar saldo do usuário usando TanStack Query
 * Usa fetchData
 */
export const useUserBalanceQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['userBalance', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar saldo')
      }

      const url = `${import.meta.env.VITE_API_URL}/users/${userId}/balance`
      return fetchDataDirect<number>(
        url,
        data => {
          // Transforma dados usando a função utilitária existente
          const extractBalanceFromData = (): ((data: unknown) => number) => {
            return (data: unknown) => {
              if (data && typeof data === 'object' && 'total_balance' in data) {
                const balanceData = data as { total_balance: number }
                return balanceData.total_balance || 0
              }
              return 0
            }
          }
          return extractBalanceFromData()(data)
        },
        {
          timeout: 8000, // 8 segundos (dados dinâmicos, mas geralmente rápidos)
          retries: 2, // 2 tentativas extras em caso de erro
          retryDelay: 1000 // 1 segundo entre tentativas
        }
      )
    },
    enabled: !!userId, // Só executa se userId estiver presente
    // Cache por 1 minuto para saldo (dados muito dinâmicos)
    staleTime: 1 * 60 * 1000, // 1 minute
    // Manter em cache por 2 minutos
    gcTime: 2 * 60 * 1000, // 2 minutes
    // Refetch a cada 30 segundos automaticamente
    refetchInterval: 30 * 1000, // 30 seconds
    // Retry automático configurado no queryClient para evitar duplicação
    retry: false // Desabilita retry do React Query pois já tratamos no fetchDataDirect
  })
}
