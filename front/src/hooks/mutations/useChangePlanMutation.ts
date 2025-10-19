import { useMutation, useQueryClient } from '@tanstack/react-query'
import { changePlan } from '../../services/api'
import { Contract, PlanChangeData } from '../../types/api'

/**
 * Hook de mutation para alteração de planos usando React Query
 * Baseado no useChangePlan.ts atual, mas utilizando o serviço de API centralizado
 */
export const useChangePlanMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      contractId,
      newPlanId
    }: {
      contractId: number
      newPlanId: number
    }): Promise<Contract> => {
      const changeData: PlanChangeData = {
        contractId,
        newPlanId
      }

      const result = await changePlan(changeData)
      return result.new_contract
    },
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['contracts', data.user_id] })
      queryClient.invalidateQueries({ queryKey: ['payments', data.user_id] })
      queryClient.invalidateQueries({ queryKey: ['balance', data.user_id] })
      queryClient.invalidateQueries({ queryKey: ['credit-transaction-history', data.user_id] })

      queryClient.setQueryData(['contracts', data.user_id], (oldData: Contract[] | undefined) => {
        if (!oldData) return oldData

        return oldData.map(contract => (contract.id === data.id ? data : contract))
      })
    },
    onError: _error => {
      // Tratamento de erro será feito pelo React Query e pelo Error Boundary
    },
    // Configurações específicas para operações financeiras
    retry: (failureCount, error: Error & { status?: number }) => {
      // Não retry para erros de validação (400, 422)
      if (error?.status === 400 || error?.status === 422) {
        return false
      }
      // Não retry para erro de conflito (409) - mudança de plano já processada
      if (error?.status === 409) {
        return false
      }
      // Retry uma vez para outros erros (timeout, rede, etc.)
      return failureCount < 1
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
  })
}
