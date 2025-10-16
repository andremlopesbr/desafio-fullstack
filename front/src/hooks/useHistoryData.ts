import { useCallback, useMemo } from 'react'
import { useContracts } from './useContracts'
import { usePayments } from './usePayments'
import { Payment } from '../types'

export function useHistoryData(userId: number) {
  const { contracts, contractsLoading, contractsError, refetch: refetchContracts } = useContracts()
  const { payments, paymentsLoading, paymentsError, refetch: refetchPayments } = usePayments(userId)

  const loading = contractsLoading || paymentsLoading
  const error = contractsError || paymentsError
  const sortedContracts = useMemo(() => {
    if (!contracts.length) return []

    return [...contracts].sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1
      if (a.status !== 'active' && b.status === 'active') return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [contracts])
  const historyItems = useMemo(() => {
    if (!sortedContracts.length || !payments.length) {
      return []
    }
    const paymentsMap = new Map<number, Payment[]>()
    payments.forEach((payment: Payment) => {
      const contractId = payment.contract_id
      if (!paymentsMap.has(contractId)) {
        paymentsMap.set(contractId, [])
      }
      paymentsMap.get(contractId)!.push(payment)
    })
    const result = sortedContracts.map(contract => {
      const contractPayments = paymentsMap.get(contract.id) || []
      return {
        contract,
        payments: contractPayments
      }
    })

    return result
  }, [sortedContracts, payments])

  const refetch = useCallback(async () => {
    await Promise.all([refetchContracts(), refetchPayments()])
  }, [refetchContracts, refetchPayments])

  return {
    historyItems,
    loading,
    error,
    refetch,
    contractsCount: contracts.length,
    paymentsCount: payments.length
  }
}
