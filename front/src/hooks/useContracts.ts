import { useAuth } from './useAuth'
import { useContractsQuery } from './queries/useContractsQuery'

export const useContracts = () => {
  const { user } = useAuth()

  // Usar apenas o hook com TanStack Query
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    error: contractsError,
    refetch: refetchContracts
  } = useContractsQuery(user?.id)

  // Se não há usuário autenticado, retorna dados vazios
  if (!user) {
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
