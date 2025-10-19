import { useQuery } from '@tanstack/react-query'
import { calculateCredit } from '../services/api'

/**
 * Hook personalizado para buscar cálculo de crédito usando TanStack Query
 * Usa o serviço de API simplificado
 */
export const useCreditCalculation = (contractId?: number, planId?: number) => {
  return useQuery({
    queryKey: ['credit-calculation', contractId, planId],
    queryFn: async () => {
      if (!contractId || !planId) {
        throw new Error('ContractId e PlanId são necessários para buscar cálculo de crédito')
      }

      return calculateCredit(contractId, planId)
    },
    enabled: !!contractId && !!planId,
    staleTime: 1 * 60 * 1000, // 1 minuto
    gcTime: 2 * 60 * 1000 // 2 minutos
  })
}
