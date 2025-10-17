import { useContext } from 'react'
import { PaymentsContext } from '../contexts/PaymentsContext'
import { AuthContext } from '../contexts/AuthContext'
import { useApiMutation } from './useApiMutation'
import { usePaymentsQuery } from './queries/usePaymentsQuery'

export const usePayments = (userId?: number) => {
  const paymentsContext = useContext(PaymentsContext)
  const authContext = useContext(AuthContext)

  const targetUserId = userId || authContext?.user?.id

  // Usar o novo hook com TanStack Query
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments
  } = usePaymentsQuery(targetUserId)

  // Manter compatibilidade com o contexto existente para transição suave
  if (paymentsContext && authContext?.user && targetUserId && paymentsContext.payments.length > 0) {
    return {
      payments: paymentsContext.payments,
      paymentsLoading: paymentsContext.loading,
      paymentsError: paymentsContext.error,
      refreshPayments: () => paymentsContext.refreshPayments(targetUserId),
      refetch: () => paymentsContext.refreshPayments(targetUserId)
    }
  }

  // Se não há contexto ou usuário autenticado, retorna dados vazios
  if (!targetUserId) {
    return {
      payments: [],
      paymentsLoading: false,
      paymentsError: null,
      refreshPayments: () => {},
      refetch: () => {}
    }
  }

  // Retorna dados do useQuery
  return {
    payments,
    paymentsLoading,
    paymentsError: paymentsError?.message || null,
    refreshPayments: refetchPayments,
    refetch: refetchPayments
  }
}

/**
 * Hook para processamento de pagamentos
 */
export function useProcessPayment() {
  const { data, loading, error, execute } = useApiMutation()

  const processPayment = async (data: {
    contract_id: number
    amount: number
    payment_date: string
    status?: string
  }) => {
    return execute('/payments', { method: 'POST' }, data)
  }

  return { processPayment, data, loading, error }
}
