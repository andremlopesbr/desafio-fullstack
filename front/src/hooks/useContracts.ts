import { useContext } from 'react'
import { ContractsContext } from '../contexts/ContractsContext'
import { AuthContext } from '../contexts/AuthContext'
import { useContractsQuery } from './queries/useContractsQuery'

export const useContracts = () => {
  const contractsContext = useContext(ContractsContext)
  const authContext = useContext(AuthContext)

  // Usar o novo hook com TanStack Query
  const userId = authContext?.user?.id
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    error: contractsError,
    refetch: refetchContracts
  } = useContractsQuery(userId)

  // Manter compatibilidade com o contexto existente para transição suave
  if (contractsContext && authContext?.user && contractsContext.data.length > 0) {
    return {
      contracts: contractsContext.data,
      contractsLoading: contractsContext.loading,
      contractsError: contractsContext.error,
      refreshContracts: () => contractsContext.refreshContracts(authContext.user!.id),
      refetch: () => contractsContext.refreshContracts(authContext.user!.id)
    }
  }

  // Se não há contexto ou usuário autenticado, retorna dados vazios
  if (!authContext?.user) {
    return {
      contracts: [],
      contractsLoading: false,
      contractsError: null,
      refreshContracts: () => {},
      refetch: () => {}
    }
  }

  // Retorna dados do useQuery
  return {
    contracts,
    contractsLoading,
    contractsError: contractsError?.message || null,
    refreshContracts: refetchContracts,
    refetch: refetchContracts
  }
}
