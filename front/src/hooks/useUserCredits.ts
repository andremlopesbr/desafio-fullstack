import { createApiHook } from './useApiHooksFactory'

interface UserBalanceResponse {
  total_balance: number
}

/**
 * Hook para obter créditos do usuário
 * Usa padrão Factory seguindo princípio DRY e OCP
 */
export const useUserCredits = createApiHook<UserBalanceResponse>(
  `users/${window.location.pathname.split('/')[2]}/balance`,
  (data: unknown) => {
    const balanceData = data as { total_balance?: number; balance?: number }
    return { total_balance: balanceData.total_balance || balanceData.balance || 0 }
  },
  'credits'
)
