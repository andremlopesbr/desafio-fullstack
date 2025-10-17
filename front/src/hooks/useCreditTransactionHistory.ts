import { useState, useEffect, useCallback } from 'react'
import { fetchDataDirect } from '../utils/apiUtils'

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
      const data = await fetchDataDirect<CreditTransaction[]>(
        apiUrl,
        data => data as CreditTransaction[], // Dados já vêm como array
        {
          timeout: 10000, // 10 segundos para histórico
          retries: 2, // 2 tentativas extras
          retryDelay: 1000 // 1 segundo entre tentativas
        }
      )
      setTransactions(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
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
