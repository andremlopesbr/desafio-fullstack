import { createContext, useState, useCallback, ReactNode } from 'react'

interface BalanceState {
  balance: number
  loading: boolean
  error: string | null
}

interface BalanceContextType extends BalanceState {
  refreshBalance: (userId: number) => Promise<void>
}

export const BalanceContext = createContext<BalanceContextType | undefined>(undefined)

interface BalanceProviderProps {
  children: ReactNode
}

export function BalanceProvider({ children }: BalanceProviderProps) {
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetchData = useCallback(
    async <T,>(
      url: string,
      setData: (data: T) => void,
      setLoading: (loading: boolean) => void,
      setError: (error: string | null) => void,
      transform?: (data: unknown) => T
    ) => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`Failed to fetch from ${url}`)
        const data = await response.json()
        const transformedData = transform ? transform(data) : data
        setData(transformedData)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        setError(message)
        console.error(`Error fetching from ${url}:`, message)
      } finally {
        setLoading(false)
      }
    },
    []
  )
  const refreshBalance = useCallback(
    async (userId: number) => {
      await fetchData(
        `${import.meta.env.VITE_API_URL}/users/${userId}/balance`,
        setBalance,
        setLoading,
        setError,
        (data: unknown) => {
          const balanceData = data as { total_balance: number }
          return balanceData.total_balance || 0
        }
      )
    },
    [fetchData]
  )

  const value: BalanceContextType = {
    balance,
    loading,
    error,
    refreshBalance
  }

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
}
