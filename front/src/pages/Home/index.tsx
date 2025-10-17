import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { usePlans } from '../../hooks/usePlans'
import { useContracts } from '../../hooks/useContracts'
import { useUserBalance } from '../../hooks/useUserBalance'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Notification, Card } from '../../components/ui'
import { PlanCard } from '../../components/domain'
import Layout from '../../components/Layout'
import { Plano, Contract } from '../../types'
import { formatCurrency } from '../../utils/formatters'

export const Home = () => {
  const { user } = useAuth()
  const { plans, plansLoading, plansError, refreshPlans } = usePlans()

  const { contracts, contractsLoading, contractsError, refreshContracts } = useContracts()

  const { refreshBalance } = useUserBalance()

  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [notification, setNotification] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([refreshPlans(), refreshContracts(), refreshBalance()])
      } catch (error) {
        // Erro tratado pelo ErrorBoundary - removido console.log de debug
      }
    }

    if (user?.id) {
      loadData()
    }
  }, [user?.id, refreshPlans, refreshContracts, refreshBalance])

  useEffect(() => {
    const success = searchParams.get('success')
    if (success === 'payment' && !hasProcessedPayment) {
      setHasProcessedPayment(true)

      setNotification({
        type: 'success',
        message: '✅ Pagamento confirmado! Seu plano foi contratado com sucesso.'
      })

      if (user?.id) {
        setIsRefreshing(true)

        Promise.all([refreshPlans(), refreshContracts(), refreshBalance()])
          .then(() => {})
          .catch(() => {
            // Refresh silencioso - erro tratado pelo ErrorBoundary
          })
          .finally(() => {
            setIsRefreshing(false)
          })
      }

      searchParams.delete('success')
      setSearchParams(searchParams)

      setTimeout(() => setNotification(null), 5000)
    }
  }, [
    searchParams,
    setSearchParams,
    user?.id,
    refreshPlans,
    refreshContracts,
    refreshBalance,
    hasProcessedPayment
  ])

  const loading = plansLoading || contractsLoading || isRefreshing
  const error = plansError || contractsError

  const activeContract = contracts.find((contract: Contract) => contract.status === 'active')

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-lg">Erro: {error}</div>
      </div>
    )
  }

  return (
    <Layout user={user}>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4 sm:p-6 lg:p-8">
        <div className="w-full">
          <h1 className="text-orange-400 text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
            Planos Disponíveis
          </h1>

          {}
          {notification && (
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
              autoHide={true}
              className="mb-6"
            />
          )}

          {}
          {isRefreshing && (
            <Notification
              type="success"
              message="🔄 Atualizando dados... Aguarde um momento."
              onClose={() => {}} // Não permite fechar durante refresh
              autoHide={false}
              className="mb-4 border-blue-400 bg-blue-50"
            />
          )}

          {activeContract && activeContract.plan && (
            <Card className="bg-green-100 border-green-400 text-green-700 mb-8">
              <div className="flex justify-between items-center">
                <span>
                  Plano atual: {activeContract.plan.description} -{' '}
                  {formatCurrency(activeContract.plan.price)}
                </span>
                {}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plan: Plano) => {
              const isCurrentPlan = activeContract && activeContract.plan?.id === plan.id

              return (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isCurrentPlan={isCurrentPlan}
                  onSelect={(selectedPlan: Plano) => {
                    if (!isCurrentPlan) {
                      navigate(`/payment/${selectedPlan.id}`)
                    }
                  }}
                />
              )
            })}
          </div>
        </div>
      </div>
    </Layout>
  )
}
