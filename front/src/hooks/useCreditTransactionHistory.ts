import { useQuery } from '@tanstack/react-query'
import { getCreditTransactionHistory } from '../services/api'

export function useCreditTransactionHistory(userId: number, page?: number, limit?: number) {
  return useQuery({
    queryKey: ['credit-transaction-history', userId, page, limit],
    queryFn: () => getCreditTransactionHistory(userId, page, limit),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutos
    gcTime: 5 * 60 * 1000 // 5 minutos
  })
}
