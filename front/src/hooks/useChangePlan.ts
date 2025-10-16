import { useApiMutation } from './useApiMutation'

interface Contract {
  id: number
  user_id: number
  plan_id: number
  start_date: string | null
  end_date: string | null
  status: string | null
  created_at: string
  updated_at: string
  plan: {
    id: number
    description: string
    numberOfClients: number
    gigabytesStorage: number
    price: number
    active: boolean
  }
}

interface ChangePlanResult {
  contract: Contract
  credits_available: number
  discount_applied: number
  final_amount: number
  remaining_credit: number
}

/**
 * Hook para alteração de planos
 */
export function useChangePlan() {
  const { data, loading, error, execute } = useApiMutation<ChangePlanResult>()

  const changePlan = async (
    contractId: number,
    newPlanId: number
  ): Promise<ChangePlanResult | null> => {
    const result = await execute(
      `/contracts/${contractId}/change-plan`,
      { method: 'PATCH' },
      { new_plan_id: newPlanId }
    )

    return result
  }

  return { changePlan, data, loading, error }
}
