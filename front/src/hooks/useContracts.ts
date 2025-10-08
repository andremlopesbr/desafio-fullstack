import { useEffect } from 'react';
import { useApiData } from '../contexts/ApiDataContext';

export function useContracts(userId: number) {
  const { contracts, contractsLoading, contractsError, refreshContracts } = useApiData();

  useEffect(() => {
    if (userId && contracts.length === 0 && !contractsLoading) {
      refreshContracts(userId);
    }
  }, [userId, contracts.length, contractsLoading, refreshContracts]);

  return { contracts, loading: contractsLoading, error: contractsError, refetch: () => refreshContracts(userId) };
}