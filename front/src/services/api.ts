/**
 * Serviço centralizado de API - Versão Simplificada
 */
import type { Plan, Contract, Payment, CreditCalculationResult } from '../types/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

/**
 * Função utilitária simples para requisições HTTP
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  return (result.data || result) as T
}

// Queries
export const getPlans = (): Promise<Plan[]> => request<Plan[]>('/plans')
export const getContracts = (userId: number): Promise<Contract[]> =>
  request<Contract[]>(`/contracts?user_id=${userId}`)
export const getPayments = (userId: number): Promise<Payment[]> =>
  request<Payment[]>(`/payments?user_id=${userId}`)
export const getUserBalance = (userId: number): Promise<{ total_balance: number }> =>
  request<{ total_balance: number }>(`/balance/${userId}`)

// Mutations
export interface ContractCreateWithPaymentData {
  user_id: number
  plan_id: number
  amount: number
  payment_date: string
  [key: string]: unknown
}

export interface ContractWithPaymentResult {
  contract: Contract
  payment: Payment
}

export interface ChangePlanResponse {
  new_contract: Contract
  payment?: Payment
  remaining_credit?: number
  credit_message?: string
}

export const createContractWithPayment = (
  data: ContractCreateWithPaymentData
): Promise<{ contract: Contract; payment: Payment }> => {
  return request<{ contract: Contract; payment: Payment }>('/contracts', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}

export const changePlan = ({
  contractId,
  newPlanId
}: {
  contractId: number
  newPlanId: number
}): Promise<ChangePlanResponse> => {
  return request<ChangePlanResponse>(`/contracts/${contractId}`, {
    method: 'PATCH',
    body: JSON.stringify({ new_plan_id: newPlanId })
  })
}

export const calculateCredit = (
  contractId: number,
  planId: number
): Promise<CreditCalculationResult> => {
  return request<CreditCalculationResult>(
    `/contracts/${contractId}/credit-calculation?plan_id=${planId}`
  )
}

export interface CreditTransactionHistoryItem {
  id: number
  user_id: number
  amount: number
  type: string
  description: string
  created_at: string
  updated_at: string
}

export const getCreditTransactionHistory = (
  userId: number,
  page?: number,
  limit?: number
): Promise<CreditTransactionHistoryItem[]> => {
  let url = `/credit-transaction-history/${userId}`

  const params = new URLSearchParams()
  if (page) params.append('page', page.toString())
  if (limit) params.append('limit', limit.toString())

  const queryString = params.toString()
  if (queryString) {
    url += `?${queryString}`
  }

  return request<CreditTransactionHistoryItem[]>(url)
}

// Additional functions that may be needed
export const createContract = (
  data: Omit<ContractCreateWithPaymentData, 'amount' | 'payment_date'>
): Promise<Contract> => {
  return request<Contract>('/contracts', {
    method: 'POST',
    body: JSON.stringify(data)
  })
}
