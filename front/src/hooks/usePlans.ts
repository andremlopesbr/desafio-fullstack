import { useContext } from 'react'
import { PlansContext } from '../contexts/PlansContext'
import { AuthContext } from '../contexts/AuthContext'
import { usePlansQuery } from './queries/usePlansQuery'

export const usePlans = () => {
  const plansContext = useContext(PlansContext)
  const authContext = useContext(AuthContext)

  // Usar o novo hook com TanStack Query
  const {
    data: plans = [],
    isLoading: plansLoading,
    error: plansError,
    refetch: refetchPlans
  } = usePlansQuery()

  // Manter compatibilidade com o contexto existente para transição suave
  if (plansContext && authContext?.user) {
    // Durante a transição, podemos usar ambos os sistemas
    // Retorna dados do contexto se disponível, caso contrário usa useQuery
    if (plansContext.data.length > 0) {
      return {
        plans: plansContext.data,
        plansLoading: plansContext.loading,
        plansError: plansContext.error,
        refreshPlans: plansContext.refreshPlans,
        refetch: plansContext.refreshPlans
      }
    }
  }

  // Se não há contexto ou usuário autenticado, retorna dados vazios
  if (!authContext?.user) {
    return {
      plans: [],
      plansLoading: false,
      plansError: null,
      refreshPlans: () => {},
      refetch: () => {}
    }
  }

  // Retorna dados do useQuery
  return {
    plans,
    plansLoading,
    plansError: plansError?.message || null,
    refreshPlans: refetchPlans,
    refetch: refetchPlans
  }
}
