import { useMemo } from 'react'
import { useCreditCalculation } from './useCreditCalculation'
import { CreditCalculationResult } from '../types/api'

/**
 * Hook simplificado para obter informações de crédito para mudança de plano
 * Usa o hook useCreditCalculation que integra com a API
 */
export function usePlanCredits(
  activeContract: { id: number } | undefined,
  selectedPlan?: { id: number; price: number } | undefined,
  _userId?: number
) {
  // Usa o hook de cálculo de crédito da API com plan_id obrigatório
  const {
    data: creditCalculation,
    isLoading,
    error
  } = useCreditCalculation(activeContract?.id, selectedPlan?.id)

  // Para manter compatibilidade com a interface existente,
  // retornamos diretamente os dados da API no formato esperado
  const creditInfo = useMemo((): CreditCalculationResult | null => {
    if (!creditCalculation) return null

    return creditCalculation
  }, [creditCalculation])

  return { creditInfo, isLoading, error }
}
