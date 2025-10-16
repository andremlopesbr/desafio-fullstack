import { useState, useEffect } from 'react'
import { Contract, Plano } from '../types'
import { useContracts } from './useContracts'
import { useNavigate } from 'react-router-dom'

export function useHomePage() {
  const navigate = useNavigate()
  const [contracts, setContracts] = useState<Contract[]>([])

  const { contracts: userContracts, contractsLoading } = useContracts()

  useEffect(() => {
    setContracts(userContracts)
  }, [userContracts])

  const handleSelecionarPlano = (plano: Plano) => {
    navigate(`/payment/${plano.id}`)
  }

  const isCurrentPlan = (plano: Plano) => {
    return contracts.length > 0 && contracts[0]?.plan?.id === plano.id
  }

  return {
    contracts,
    contractsLoading,
    handleSelecionarPlano,
    isCurrentPlan
  }
}
