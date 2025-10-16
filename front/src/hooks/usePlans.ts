import { useContext } from 'react'
import { PlansContext } from '../contexts/PlansContext'
import { AuthContext } from '../contexts/AuthContext'

export const usePlans = () => {
  const plansContext = useContext(PlansContext)
  const authContext = useContext(AuthContext)

  if (!plansContext) {
    throw new Error('usePlans deve ser usado dentro de um PlansProvider')
  }

  if (!authContext) {
    throw new Error('usePlans deve ser usado dentro de um AuthProvider')
  }

  if (!authContext.user) {
    return {
      plans: [],
      plansLoading: false,
      plansError: null,
      refreshPlans: () => {},
      refetch: () => {}
    }
  }
  const refreshPlans = async () => {
    await plansContext.refreshPlans()
  }

  return {
    plans: plansContext.plans,
    plansLoading: plansContext.loading,
    plansError: plansContext.error,
    refreshPlans,
    refetch: refreshPlans
  }
}
