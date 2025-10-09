import { useEffect, useRef } from "react";
import { useApiData } from "./useApiData";

export function usePlans() {
  const { plans, plansLoading, plansError, refreshPlans } = useApiData();
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current && plans.length === 0 && !plansLoading) {
      hasFetchedRef.current = true;
      refreshPlans();
    }
  }, [plans.length, plansLoading, refreshPlans]);

  return {
    plans,
    loading: plansLoading,
    error: plansError,
    refetch: refreshPlans,
  };
}
