import { useQuery } from '@tanstack/react-query'
import { getContracts } from '../../services/api'
import { Contract } from '../../types/api'

/**
 * Hook personalizado para buscar contratos do usuário usando TanStack Query
 * Usa o serviço de API simplificado
 */
export const useContractsQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['contracts', userId],
    queryFn: async (): Promise<Contract[]> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar contratos')
      }

      return getContracts(userId)
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutos - contratos mudam pouco frequentemente
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false, // Evitar refetch desnecessário
    refetchOnReconnect: true
  })
}
