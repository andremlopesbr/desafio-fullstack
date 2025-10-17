import { usePlansQuery } from './queries/usePlansQuery'

export const usePlans = () => {
  // Usar apenas o hook com TanStack Query
  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans
  } = usePlansQuery()

  // Retorna dados do useQuery
  return {
    plans,
    plansLoading,
    plansError: plansError?.message || null,
    refreshPlans: refetchPlans,
    refetch: refetchPlans
  }
}
