import { useContext } from 'react';
import { createTransformingApiHook } from './useApiHooksFactory';
import { AuthContext } from '../contexts/AuthContext';

const userBalanceHook = createTransformingApiHook(
  'users/${userId}/balance',
  (data: { total_balance: number }) => data.total_balance || 0,
  'balance'
);

export const useUserBalance = (userId?: number) => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useUserBalance deve ser usado dentro de um AuthProvider');
  }

  const targetUserId = userId || authContext.user?.id;

  if (!targetUserId) {
    return {
      balance: 0,
      balanceLoading: false,
      balanceError: null,
      refreshBalance: () => {},
      refetch: () => {}
    };
  }

  return userBalanceHook(targetUserId);
};
