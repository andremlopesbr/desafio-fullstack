import { useContext } from 'react'
import { BalanceContext } from '../contexts/BalanceContext'
import { AuthContext } from '../contexts/AuthContext'
import { useUserBalanceQuery } from './queries/useUserBalanceQuery'

export const useUserBalance = (userId?: number) => {
  const balanceContext = useContext(BalanceContext)
  const authContext = useContext(AuthContext)

  const targetUserId = userId || authContext?.user?.id

  // Usar o novo hook com TanStack Query
  const {
    data: balance = 0,
    isLoading: balanceLoading,
    error: balanceError,
    refetch: refetchBalance
  } = useUserBalanceQuery(targetUserId)

  // Manter compatibilidade com o contexto existente para transição suave
  if (balanceContext && authContext?.user && targetUserId && balanceContext.balance > 0) {
    return {
      balance: balanceContext.balance,
      balanceLoading: balanceContext.loading,
      balanceError: balanceContext.error,
      refreshBalance: () => balanceContext.refreshBalance(targetUserId),
      refetch: () => balanceContext.refreshBalance(targetUserId)
    }
  }

  // Se não há contexto ou usuário autenticado, retorna dados vazios
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
