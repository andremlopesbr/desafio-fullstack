import { useEffect } from 'react';
import { useApiData } from '../contexts/ApiDataContext';

export function useUserBalance(userId: number) {
  const { balance, balanceLoading, balanceError, refreshBalance } = useApiData();

  useEffect(() => {
    if (userId && balance === 0 && !balanceLoading) {
      refreshBalance(userId);
    }
  }, [userId, balance, balanceLoading, refreshBalance]);

  return {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: () => refreshBalance(userId)
  };
}