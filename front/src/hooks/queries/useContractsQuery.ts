import { useQuery } from '@tanstack/react-query'
import { extractArrayFromData } from '../../utils/apiUtils'
import { Contract } from '../../types/api'

/**
 * Hook personalizado para buscar contratos do usuário usando TanStack Query
 * Substitui o contexto ContractsContext por useQuery para melhor performance
 */
export const useContractsQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['contracts', userId],
    queryFn: async (): Promise<Contract[]> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar contratos')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`)
      if (!response.ok) {
        throw new Error(`Erro ao buscar contratos: ${response.statusText}`)
      }

      const data = await response.json()
      return extractArrayFromData<Contract>()(data)
    },
    enabled: !!userId, // Só executa se userId estiver presente
    // Cache por 2 minutos para contratos (dados mais dinâmicos)
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Manter em cache por 5 minutos
    gcTime: 5 * 60 * 1000 // 5 minutes
  })
}
