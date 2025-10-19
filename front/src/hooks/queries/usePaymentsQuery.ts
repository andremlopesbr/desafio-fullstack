import { useQuery } from '@tanstack/react-query'
import { getPayments } from '../../services/api'
import { Payment } from '../../types/api'

/**
 * Hook personalizado para buscar pagamentos do usuário usando TanStack Query
 * Usa o serviço de API simplificado
 */
export const usePaymentsQuery = (userId?: number) => {
  return useQuery({
    queryKey: ['payments', userId],
    queryFn: async (): Promise<Payment[]> => {
      if (!userId) {
        throw new Error('UserId é necessário para buscar pagamentos')
      }

      return getPayments(userId)
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000 // 5 minutos
  })
}
