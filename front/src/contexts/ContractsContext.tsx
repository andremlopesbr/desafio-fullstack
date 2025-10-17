/**
 * Contexto para gerenciamento de contratos
 *
 * Este contexto gerencia o estado global relacionado a contratos de usuários,
 * fornecendo funcionalidades para buscar e atualizar dados de contratos.
 */

import { createContext, useState, ReactNode } from 'react'
import { fetchData, extractArrayFromData } from '../utils/apiUtils'
import { Contract, ContractsContextType } from '../types/api'

export const ContractsContext = createContext<ContractsContextType | undefined>(undefined)

interface ContractsProviderProps {
  children: ReactNode
}

export function ContractsProvider({ children }: ContractsProviderProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Busca contratos do usuário na API
   *
   * Esta função busca todos os contratos associados a um usuário específico,
   * tratando automaticamente o formato de resposta da API e atualizando
   * o estado global de contratos.
   *
   * @param userId - ID do usuário para buscar contratos
   */
  const refreshContracts = async (userId: number) => {
    await fetchData(
      `${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`,
      setContracts,
      setLoading,
      setError,
      extractArrayFromData<Contract>()
    )
  }

  const value: ContractsContextType = {
    data: contracts,
    loading,
    error,
    refreshContracts
  }

  return <ContractsContext.Provider value={value}>{children}</ContractsContext.Provider>
}
