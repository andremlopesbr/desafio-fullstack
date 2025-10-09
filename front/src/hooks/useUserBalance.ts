import { useEffect, useRef } from 'react';
import { useApiData } from './useApiData';

export function useUserBalance(userId: number) {
  const { balance, balanceLoading, balanceError, refreshBalance } = useApiData();
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (userId && !balanceLoading && (!hasFetchedRef.current || lastUserIdRef.current !== userId)) {
      hasFetchedRef.current = true;
      lastUserIdRef.current = userId;
      refreshBalance(userId);
    }
  }, [userId, balanceLoading, refreshBalance]);

  return {
    balance,
    loading: balanceLoading,
    error: balanceError,
    refetch: () => refreshBalance(userId)
  };
}