import { useMemo } from 'react'
import { Contract } from '../types'

/**
 * Hook simplificado para cálculo de desconto de troca de plano
 * Usa apenas dados locais - lógica de negócio deveria estar no backend
 */
export function usePlanDiscount(
  activeContract: Contract | undefined,
  selectedPlan: { id: number; price: number } | undefined,
  userBalance?: number
) {
  const discountData = useMemo(() => {
    if (
      !activeContract ||
      !selectedPlan ||
      !activeContract.start_date ||
      !activeContract.plan ||
      userBalance === undefined
    ) {
      return null
    }

    const databaseCredits = userBalance || 0

    return {
      databaseCredits,
      proratedDiscount: 0, // Simplificado - cálculo completo deveria vir do backend
      availableCredits: databaseCredits,
      finalPrice: Math.max(0, selectedPlan.price - databaseCredits),
      discount: Math.min(selectedPlan.price, databaseCredits)
    }
  }, [activeContract, selectedPlan, userBalance])

  return {
    data: discountData,
    loading: false,
    error: undefined,
    // Refetch não é mais necessário pois usa dados locais
    refetch: () => Promise.resolve()
  }
}
