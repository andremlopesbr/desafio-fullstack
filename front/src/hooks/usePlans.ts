import { useEffect } from 'react';
import { useApiData } from '../contexts/ApiDataContext';

export function usePlans() {
  const { plans, plansLoading, plansError, refreshPlans } = useApiData();

  useEffect(() => {
    if (plans.length === 0 && !plansLoading) {
      refreshPlans();
    }
  }, [plans.length, plansLoading, refreshPlans]);

  return { plans, loading: plansLoading, error: plansError, refetch: refreshPlans };
}