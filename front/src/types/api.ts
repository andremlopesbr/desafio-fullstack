/**
 * Tipos compartilhados para entidades da API
 *
 * Este arquivo centraliza todas as interfaces e tipos relacionados
 * às entidades da API, evitando duplicação entre contextos.
 */

/**
 * Interface que representa um plano no sistema
 */
export interface Plan {
  id: number
  description: string
  numberOfClients: number
  gigabytesStorage: number
  price: number
  active: boolean
}

/**
 * Interface que representa um contrato no sistema
 */
export interface Contract {
  id: number
  user_id: number
  plan_id: number
  start_date: string | null
  end_date: string | null
  status: string | null
  created_at: string
  updated_at: string
  plan: Plan
}

/**
 * Interface que representa um pagamento no sistema
 */
export interface Payment {
  id: number
  contract_id: number
  amount: number
  payment_date: string
  status: string
  created_at: string
  updated_at: string
}

/**
 * Estados de carregamento para contextos de API
 */
export interface ApiState<T> {
  data: T
  loading: boolean
  error: string | null
}

/**
 * Tipos de contexto para diferentes entidades
 */
export interface PlansContextType extends ApiState<Plan[]> {
  refreshPlans: () => Promise<void>
}

export interface ContractsContextType extends ApiState<Contract[]> {
  refreshContracts: (userId: number) => Promise<void>
}

export interface PaymentsContextType extends ApiState<Payment[]> {
  refreshPayments: (userId: number) => Promise<void>
}

export interface BalanceContextType extends ApiState<number> {
  refreshBalance: (userId: number) => Promise<void>
}
