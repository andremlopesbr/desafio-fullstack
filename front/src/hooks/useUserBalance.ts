import { useContext } from 'react'
import { BalanceContext } from '../contexts/BalanceContext'
import { AuthContext } from '../contexts/AuthContext'

export const useUserBalance = (userId?: number) => {
  const balanceContext = useContext(BalanceContext)
  const authContext = useContext(AuthContext)

  if (!balanceContext) {
    throw new Error('useUserBalance deve ser usado dentro de um BalanceProvider')
  }

  if (!authContext) {
    throw new Error('useUserBalance deve ser usado dentro de um AuthProvider')
  }

  const targetUserId = userId || authContext.user?.id

  if (!targetUserId) {
    return {
      balance: 0,
      balanceLoading: false,
      balanceError: null,
      refreshBalance: () => {},
      refetch: () => {}
    }
  }

  const refreshBalance = async () => {
    await balanceContext.refreshBalance(targetUserId)
  }

  return {
    balance: balanceContext.balance,
    balanceLoading: balanceContext.loading,
    balanceError: balanceContext.error,
    refreshBalance,
    refetch: refreshBalance
  }
}
