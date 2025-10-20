import { useQueryClient } from '@tanstack/react-query'

interface InvalidationOptions {
  /** Se deve invalidar apenas queries exatas (sem incluir queries filhas) */
  exact?: boolean
  /** Callback executado após invalidação */
  onSuccess?: () => void
  /** Callback executado em caso de erro */
  onError?: (error: Error) => void
}

/**
 * Hook personalizado para invalidação seletiva e inteligente de queries
 * Evita invalidações desnecessárias e otimiza performance
 */
export const useOptimizedInvalidation = () => {
  const queryClient = useQueryClient()

  const invalidateUserData = async (userId: number, options: InvalidationOptions = {}) => {
    try {
      const { exact = true, onSuccess } = options

      // Invalida contratos do usuário específico apenas
      await queryClient.invalidateQueries({
        queryKey: ['contracts', userId],
        exact
      })

      // Invalida pagamentos apenas se houver mudanças
      await queryClient.invalidateQueries({
        queryKey: ['payments', userId],
        exact
      })

      // Invalida saldo do usuário
      await queryClient.invalidateQueries({
        queryKey: ['balance', userId],
        exact
      })

      onSuccess?.()
    } catch (error) {
      options.onError?.(error as Error)
    }
  }

  const invalidateContractSpecific = async (
    userId: number,
    contractId: number,
    options: InvalidationOptions = {}
  ) => {
    try {
      const { onSuccess } = options

      // Invalida apenas contratos relacionados
      await queryClient.invalidateQueries({
        queryKey: ['contracts', userId],
        exact: true
      })

      // Atualiza dados relacionados ao contrato específico
      await queryClient.invalidateQueries({
        queryKey: ['contracts', userId, 'details', contractId],
        exact: true
      })

      onSuccess?.()
    } catch (error) {
      options.onError?.(error as Error)
    }
  }

  const invalidateAfterPayment = async (userId: number, options: InvalidationOptions = {}) => {
    try {
      const { onSuccess } = options

      // Apenas dados críticos após pagamento
      await queryClient.invalidateQueries({
        queryKey: ['contracts', userId],
        exact: true
      })

      await queryClient.invalidateQueries({
        queryKey: ['balance', userId],
        exact: true
      })

      // Remove dados que podem estar desatualizados
      queryClient.removeQueries({
        queryKey: ['credit-calculation']
      })

      onSuccess?.()
    } catch (error) {
      options.onError?.(error as Error)
    }
  }

  const invalidateAllUserData = async (userId: number, options: InvalidationOptions = {}) => {
    try {
      const { onSuccess } = options

      // Invalidação completa mas seletiva por usuário
      const invalidationPromises = [
        queryClient.invalidateQueries({ queryKey: ['contracts', userId] }),
        queryClient.invalidateQueries({ queryKey: ['payments', userId] }),
        queryClient.invalidateQueries({ queryKey: ['balance', userId] }),
        queryClient.invalidateQueries({ queryKey: ['credit-transaction-history', userId] }),
        queryClient.invalidateQueries({ queryKey: ['plans'] }) // Compartilhado, mas necessário
      ]

      await Promise.all(invalidationPromises)
      onSuccess?.()
    } catch (error) {
      options.onError?.(error as Error)
    }
  }

  return {
    invalidateUserData,
    invalidateContractSpecific,
    invalidateAfterPayment,
    invalidateAllUserData
  }
}
