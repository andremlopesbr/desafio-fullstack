import { useApiMutation } from './useApiMutation'

interface ContractCreate {
  user_id: number
  plan_id: number
  start_date?: string
  end_date?: string
  status?: string
}

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

interface CreateContractWithPaymentData extends ContractCreate {
  amount: number
  payment_date: string
  status?: string
  discount_applied?: number
  prorated_old?: number
  prorated_new?: number
  applied_credits?: number
}

interface CreateContractWithPaymentResult {
  contract: Contract
  payment?: {
    id: number
    contract_id: number
    amount: string
    payment_date: string
    status: string
    created_at: string
    updated_at: string
  }
}

/**
 * Hook para criação de contratos
 */
export function useCreateContract() {
  const { data, loading, error, execute } = useApiMutation<Contract>()

  const createContract = async (data: ContractCreate): Promise<Contract | null> => {
    return execute<ContractCreate>('/contracts', { method: 'POST' }, data)
  }

  return { createContract, data, loading, error }
}

/**
 * Hook para criação de contrato com pagamento integrado (primeira compra)
 * Segue o mesmo padrão do useChangePlan para evitar problemas de CORS
 */
export function useCreateContractWithPayment() {
  const { data, loading, error, execute } = useApiMutation<CreateContractWithPaymentResult>()

  const createContractWithPayment = async (
    data: CreateContractWithPaymentData
  ): Promise<CreateContractWithPaymentResult | null> => {
    return execute<CreateContractWithPaymentData>(
      '/contracts/create-with-payment',
      { method: 'POST' },
      data
    )
  }

  return { createContractWithPayment, data, loading, error }
}
