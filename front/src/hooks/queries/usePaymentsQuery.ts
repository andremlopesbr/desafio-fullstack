import { useQuery } from '@tanstack/react-query'
import { extractArrayFromData } from '../../utils/apiUtils'
import { Payment } from '../../contexts/PaymentsContext'

/**
 * Hook personalizado para buscar pagamentos do usuário usando TanStack Query
 * Substitui o contexto PaymentsContext por useQuery para melhor performance
 */
export const usePaymentsQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['payments', userId],
    queryFn: async (): Promise<Payment[]> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar pagamentos')
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`)
      if (!response.ok) {
        throw new Error(`Erro ao buscar pagamentos: ${response.statusText}`)
      }

      const data = await response.json()
      return extractArrayFromData<Payment>()(data)
    },
    enabled: !!userId, // Só executa se userId estiver presente
    // Cache por 2 minutos para pagamentos (dados dinâmicos)
    staleTime: 2 * 60 * 1000, // 2 minutes
    // Manter em cache por 5 minutos
    gcTime: 5 * 60 * 1000 // 5 minutes
  })
}
