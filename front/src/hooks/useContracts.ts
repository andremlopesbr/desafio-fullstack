import { useEffect, useRef } from 'react';
import { useApiData } from './useApiData';

export function useContracts(userId: number) {
  const { contracts, contractsLoading, contractsError, refreshContracts } = useApiData();
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (userId && !contractsLoading && (!hasFetchedRef.current || lastUserIdRef.current !== userId)) {
      hasFetchedRef.current = true;
      lastUserIdRef.current = userId;
      refreshContracts(userId);
    }
  }, [userId, contractsLoading, refreshContracts]);

  return { contracts, loading: contractsLoading, error: contractsError, refetch: () => refreshContracts(userId) };
}