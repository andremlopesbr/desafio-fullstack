import { useContext } from 'react'
import { ContractsContext } from '../contexts/ContractsContext'
import { AuthContext } from '../contexts/AuthContext'

export const useContracts = () => {
  const contractsContext = useContext(ContractsContext)
  const authContext = useContext(AuthContext)

  if (!contractsContext) {
    throw new Error('useContracts deve ser usado dentro de um ContractsProvider')
  }

  if (!authContext) {
    throw new Error('useContracts deve ser usado dentro de um AuthProvider')
  }

  if (!authContext.user) {
    return {
      contracts: [],
      contractsLoading: false,
      contractsError: null,
      refreshContracts: () => {},
      refetch: () => {}
    }
  }

  const refreshContracts = async () => {
    await contractsContext.refreshContracts(authContext.user!.id)
  }

  return {
    contracts: contractsContext.contracts,
    contractsLoading: contractsContext.loading,
    contractsError: contractsContext.error,
    refreshContracts,
    refetch: refreshContracts
  }
}
