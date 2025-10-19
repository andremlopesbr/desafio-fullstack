import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createContract, createContractWithPayment } from '../../services/api'
import {
  Contract,
  Payment,
  ContractCreateData,
  ContractWithPaymentData,
  ContractWithPaymentResult
} from '../../types/api'

/**
 * Hook de mutation para criação de contratos usando React Query
 * Baseado no useCreateContract.ts atual, mas utilizando o serviço de API centralizado
 */
export const useCreateContractMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (contractData: ContractCreateData): Promise<Contract> => {
      return createContract(contractData)
    },
    onSuccess: data => {
      // Invalida cache relacionado após criação de contrato bem-sucedida
      queryClient.invalidateQueries({ queryKey: ['contracts', data.user_id] })
      queryClient.invalidateQueries({ queryKey: ['plans'] })

      // Adiciona o novo contrato ao cache
      queryClient.setQueryData(['contracts', data.user_id], (oldData: Contract[] | undefined) => {
        if (!oldData) return [data]
        return [...oldData, data]
      })
    },
    onError: _error => {},
    // Configurações específicas para operações financeiras
    retry: (_failureCount, error: Error & { status?: number }) => {
      // Não retry para erros de validação (400, 422)
      if (error?.status === 400 || error?.status === 422) {
        return false
      }
      // Não retry para erro de conflito (409) - contrato já existe
      if (error?.status === 409) {
        return false
      }
      // Retry uma vez para outros erros (timeout, rede, etc.)
      return _failureCount < 1
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000)
  })
}

/**
 * Hook de mutation para criação de contrato com pagamento integrado (primeira compra)
 * Segue o mesmo padrão do useCreateContractWithPayment para evitar problemas de CORS
 */
export const useCreateContractWithPaymentMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      paymentData: ContractWithPaymentData
    ): Promise<ContractWithPaymentResult> => {
      return createContractWithPayment(paymentData)
    },
    onSuccess: data => {
      // Invalida cache relacionado após criação com pagamento bem-sucedida
      queryClient.invalidateQueries({ queryKey: ['contracts', data.contract.user_id] })
      queryClient.invalidateQueries({ queryKey: ['payments', data.contract.user_id] })
      queryClient.invalidateQueries({ queryKey: ['balance', data.contract.user_id] })
      queryClient.invalidateQueries({
        queryKey: ['credit-transaction-history', data.contract.user_id]
      })
      queryClient.invalidateQueries({ queryKey: ['plans'] })

      // Adiciona o novo contrato ao cache
      queryClient.setQueryData(
        ['contracts', data.contract.user_id],
        (oldData: Contract[] | undefined) => {
          if (!oldData) return [data.contract]
          return [...oldData, data.contract]
        }
      )

      // Adiciona o pagamento ao cache se existir
      if (data.payment) {
        queryClient.setQueryData(
          ['payments', data.contract.user_id],
          (oldData: Payment[] | undefined) => {
            if (!oldData) return [data.payment!]
            return [...oldData, data.payment!]
          }
        )
      }
    },
    onError: _error => {},
    // Configurações específicas para operações financeiras críticas
    retry: (_failureCount, error: Error & { status?: number }) => {
      // Não retry para erros de validação (400, 422)
      if (error?.status === 400 || error?.status === 422) {
        return false
      }
      // Não retry para erro de conflito (409) - contrato já existe
      if (error?.status === 409) {
        return false
      }
      // Não retry para operações financeiras - evita duplicação de pagamentos
      return false
    }
    // Não há retryDelay pois retry está desabilitado para operações financeiras
  })
}
