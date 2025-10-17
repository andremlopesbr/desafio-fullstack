import { useQuery } from '@tanstack/react-query'
import { extractBalanceFromData } from '../../utils/apiUtils'

/**
 * Hook personalizado para buscar saldo do usuário usando TanStack Query
 * Substitui o contexto BalanceContext por useQuery para melhor performance
 */
export const useUserBalanceQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['userBalance', userId],
    queryFn: async (): Promise<number> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar saldo')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`)
      if (!response.ok) {
        throw new Error(`Erro ao buscar saldo: ${response.statusText}`)
      }

      const data = await response.json()
      return extractBalanceFromData()(data)
    },
    enabled: !!userId, // Só executa se userId estiver presente
    // Cache por 1 minuto para saldo (dados muito dinâmicos)
    staleTime: 1 * 60 * 1000, // 1 minute
    // Manter em cache por 2 minutos
    gcTime: 2 * 60 * 1000, // 2 minutes
    // Refetch a cada 30 segundos automaticamente
    refetchInterval: 30 * 1000 // 30 seconds
  })
}
