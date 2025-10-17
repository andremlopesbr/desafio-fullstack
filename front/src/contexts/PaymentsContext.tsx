/**
 * Contexto para gerenciamento de pagamentos
 *
 * Este contexto gerencia o estado global relacionado a pagamentos de usuários,
 * fornecendo funcionalidades para buscar e atualizar dados de pagamentos.
 */

import { createContext, useState, ReactNode } from 'react'
import { fetchData, extractArrayFromData } from '../utils/apiUtils'

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

interface PaymentsState {
  payments: Payment[]
  loading: boolean
  error: string | null
}

interface PaymentsContextType extends PaymentsState {
  refreshPayments: (userId: number) => Promise<void>
}

export const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined)

interface PaymentsProviderProps {
  children: ReactNode
}

export function PaymentsProvider({ children }: PaymentsProviderProps) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Busca pagamentos do usuário na API
   *
   * Esta função busca todos os pagamentos associados a um usuário específico,
   * tratando automaticamente o formato de resposta da API e atualizando
   * o estado global de pagamentos.
   *
   * @param userId - ID do usuário para buscar pagamentos
   */
  const refreshPayments = async (userId: number) => {
    await fetchData(
      `${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`,
      setPayments,
      setLoading,
      setError,
      extractArrayFromData<Payment>()
    )
  }

  const value: PaymentsContextType = {
    payments,
    loading,
    error,
    refreshPayments
  }

  return <PaymentsContext.Provider value={value}>{children}</PaymentsContext.Provider>
}
