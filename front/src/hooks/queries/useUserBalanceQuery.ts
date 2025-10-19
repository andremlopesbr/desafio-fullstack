import { useQuery } from '@tanstack/react-query'
import { getUserBalance } from '../../services/api'

/**
 * Hook personalizado para buscar saldo do usuário usando TanStack Query
 * Usa o serviço de API simplificado
 */
export const useUserBalanceQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['userBalance', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar saldo')
      }

      const response = await getUserBalance(userId)
      return response.total_balance || 0
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 30 * 1000 // 30 segundos
  })
}
