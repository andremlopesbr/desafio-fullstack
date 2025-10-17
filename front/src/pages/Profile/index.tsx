import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useContracts } from '../../hooks/useContracts'
import { Breadcrumbs } from '../../components/ui'
import Layout from '../../components/Layout'
import { formatCurrency } from '../../utils/formatters'
import { Contract } from '../../types'
import { UserBalance } from '../../components/ui'

/**
 * Página de Perfil do Usuário
 *
 * Exibe informações pessoais, plano atual e saldo disponível.
 * Implementa loading simplificado e tratamento de erros robusto.
 */
const Profile = () => {
  const { user: authUser } = useAuth()
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { contracts, contractsLoading, refreshContracts } = useContracts()
  const isDataReady = useMemo(() => {
    if (contractsLoading) return false
    if (isLoading) return false
    return true
  }, [contractsLoading, isLoading])
  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true)
      try {
        if (authUser) {
          setUser(authUser)
        } else {
          const response = await fetch(`${import.meta.env.VITE_API_URL}/user`)
          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
          } else {
            console.error('❌ [PROFILE] Erro ao buscar usuário:', response.status)
          }
        }
        if (authUser?.id) {
          await refreshContracts()
        } else {
          console.warn('⚠️ [PROFILE] Nenhum ID de usuário disponível para carregar contratos')
        }
      } catch (error) {
        console.error('❌ [PROFILE] Erro ao carregar dados do perfil:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfileData()
  }, [authUser, refreshContracts])
  if (!isDataReady) {
    return (
      <Layout user={{ id: authUser?.id || 1, name: authUser?.name || 'Carregando...' }}>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="text-lg mb-2">Carregando perfil...</div>
            <div className="text-sm text-gray-500">
              {contractsLoading ? 'Carregando contratos...' : 'Carregando dados do usuário...'}
            </div>
          </div>
        </div>
      </Layout>
    )
  }
  if (!user) {
    return (
      <Layout user={{ id: authUser?.id || 1, name: authUser?.name || 'Erro' }}>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="text-red-500 text-lg">Erro ao carregar perfil do usuário</div>
        </div>
      </Layout>
    )
  }
  const activeContract = contracts.find((contract: Contract) => contract.status === 'active')

  return (
    <Layout user={{ id: user.id, name: user.name }}>
      <Breadcrumbs items={[{ name: 'Perfil', href: '/profile' }]} />

      <div className="p-4 sm:p-6 lg:p-8">
        <UserBalance showRefreshButton={true} />

        <h1 className="text-orange-400 text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Meu Perfil
        </h1>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Informações Pessoais</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Nome:</span>
                    <p className="text-gray-900">{user.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">ID:</span>
                    <p className="text-gray-900">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Plano Atual</h2>
              {activeContract && activeContract.plan ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-800 font-medium">Plano Ativo</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-900 font-medium">{activeContract.plan.description}</p>
                    <p className="text-gray-700">
                      Preço: {formatCurrency(activeContract.plan.price)}/mês
                    </p>
                    <p className="text-gray-700">
                      Vistorias: {activeContract.plan.numberOfClients}
                    </p>
                    <p className="text-gray-700">
                      Armazenamento: {activeContract.plan.gigabytesStorage} GB
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-gray-600 font-medium">Nenhum Plano Ativo</span>
                  </div>
                  <p className="text-gray-500 text-sm">
                    Você ainda não possui um plano contratado.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <Link
              to="/"
              className="bg-orange-500 text-white px-4 sm:px-6 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              Ver Planos Disponíveis
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Profile
