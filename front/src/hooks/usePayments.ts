import { useAuth } from './useAuth'
import { usePaymentsQuery } from './queries/usePaymentsQuery'

export const usePayments = (userId?: number) => {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  // Usar apenas o hook com TanStack Query
  const {
    data: payments = [],
    isLoading: paymentsLoading,
    error: paymentsError,
    refetch: refetchPayments
  } = usePaymentsQuery(targetUserId)

  // Se não há usuário autenticado, retorna dados vazios
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

// Hook useProcessPayment removido - funcionalidade integrada diretamente nos componentes
