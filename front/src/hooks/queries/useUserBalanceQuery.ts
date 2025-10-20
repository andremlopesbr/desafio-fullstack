import { useQuery } from '@tanstack/react-query'
import { getUserBalance } from '../../services/api'

/**
 * Hook personalizado para buscar saldo do usuário usando TanStack Query
 * Usa o serviço de API simplificado
 */
export const useUserBalanceQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['balance', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar saldo')
      }

      const response = await getUserBalance(userId)
      return response.total_balance || 0
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos - saldo não muda frequentemente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false, // Evitar refetch desnecessário
    refetchOnReconnect: true
  })
}
