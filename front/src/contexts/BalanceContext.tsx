import { createContext, useState, ReactNode } from 'react'
import { fetchData, extractBalanceFromData } from '../utils/apiUtils'

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

  const refreshBalance = async (userId: number) => {
    await fetchData(
      `${import.meta.env.VITE_API_URL}/users/${userId}/balance`,
      setBalance,
      setLoading,
      setError,
      extractBalanceFromData()
    )
  }

  const value: BalanceContextType = {
    balance,
    loading,
    error,
    refreshBalance
  }

  return <BalanceContext.Provider value={value}>{children}</BalanceContext.Provider>
}
