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

/**
 * Interface que representa o resultado do cálculo de crédito via API
 */
export interface CreditCalculationResult {
  database_credits: number
  prorated_discount: number
  prorated_old: number
  prorated_new: number
  available_credits: number
  final_price: number
  discount: number
}

/**
 * Interface para criação de contratos
 */
export interface ContractCreateData {
  user_id: number
  plan_id: number
  [key: string]: unknown
}

/**
 * Interface para criação de contratos com pagamento
 */
export interface ContractWithPaymentData extends ContractCreateData {
  amount: number
  payment_date: string
}

/**
 * Interface para o resultado da criação de contrato com pagamento
 */
export interface ContractWithPaymentResult {
  contract: Contract
  payment: Payment
}

/**
 * Interface para mudança de plano
 */
export interface PlanChangeData {
  contractId: number
  newPlanId: number
}

/**
 * Interface para resposta de mudança de plano
 */
export interface ChangePlanResponse {
  new_contract: Contract
  payment?: Payment
  remaining_credit?: number
  credit_message?: string
}

/**
 * Interface para item do histórico de transações de crédito
 */
export interface CreditTransactionHistoryItem {
  id: number
  user_id: number
  amount: number
  type: string
  description: string
  created_at: string
  updated_at: string
}
