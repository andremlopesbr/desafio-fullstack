import { createContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { fetchData, extractArrayFromData } from '../utils/apiUtils'
import { Plan, PlansContextType } from '../types/api'

export const PlansContext = createContext<PlansContextType | undefined>(undefined)

interface PlansProviderProps {
  children: ReactNode
}

export function PlansProvider({ children }: PlansProviderProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const refreshPlans = useCallback(async () => {
    await fetchData(
      `${import.meta.env.VITE_API_URL}/plans`,
      setPlans,
      setLoading,
      setError,
      extractArrayFromData<Plan>()
    )
  }, [])
  useEffect(() => {
    if (!initialized) {
      setInitialized(true)
      refreshPlans()
    }
  }, [initialized, refreshPlans])

  const value: PlansContextType = {
    data: plans,
    loading,
    error,
    refreshPlans
  }

  return <PlansContext.Provider value={value}>{children}</PlansContext.Provider>
}
