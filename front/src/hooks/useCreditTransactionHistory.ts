import { useState, useEffect, useCallback } from 'react'

interface CreditTransaction {
  id: number
  user_id: number
  amount: number
  type: 'credit' | 'debit'
  description: string
  metadata?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export function useCreditTransactionHistory(userId: number) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/users/${userId}/balance-history`
      const response = await fetch(apiUrl)
      if (!response.ok) throw new Error('Failed to fetch balance history')

      const data = await response.json()
      setTransactions(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ [HOOK useCreditTransactionHistory] Erro ao buscar transações:', errorMsg)
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) {
      fetchTransactions()
    }
  }, [userId, fetchTransactions])

  return { transactions, loading, error, refetch: fetchTransactions }
}
