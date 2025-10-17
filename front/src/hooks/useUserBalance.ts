import { useAuth } from './useAuth'
import { useUserBalanceQuery } from './queries/useUserBalanceQuery'

export const useUserBalance = (userId?: number) => {
  const { user } = useAuth()
  const targetUserId = userId || user?.id

  // Usar apenas o hook com TanStack Query
  const {
    data: balance = 0,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useUserBalanceQuery(targetUserId)

  // Se não há usuário autenticado, retorna dados vazios
  if (!targetUserId) {
    return {
      balance: 0,
      balanceLoading: false,
      balanceError: null,
      refreshBalance: () => {},
      refetch: () => {}
    }
  }

  // Retorna dados do useQuery
  return {
    balance,
    balanceLoading,
    balanceError: balanceError?.message || null,
    refreshBalance: refetchBalance,
    refetch: refetchBalance
  }
}
