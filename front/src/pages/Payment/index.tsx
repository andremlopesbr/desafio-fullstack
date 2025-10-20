import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { usePlans } from '../../hooks/usePlans'
import { useContracts } from '../../hooks/useContracts'
import {
  useCreateContractMutation,
  useCreateContractWithPaymentMutation
} from '../../hooks/mutations/useCreateContractMutation'
import { changePlan } from '../../services/api'
import { useUserBalance } from '../../hooks/useUserBalance'
import { usePlanCredits } from '../../hooks/usePlanCredits'
import Pix from 'react-qrcode-pix'
import { Modal, LoadingSpinner } from '../../components/ui'
import { PlanChangeDetails } from '../../components/domain/PlanChangeDetails'
import { PaymentErrorBoundary } from '../../components/error/ContextualErrorBoundary'
import Layout from '../../components/Layout'
import {
  formatCurrency,
  calculateContractEndDate,
  getAuthenticatedUserData
} from '../../utils/formatters'
import { Plano, Contract } from '../../types'

export const Payment = () => {
  const { planId } = useParams<{ planId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [pixPayload, setPixPayload] = useState<string>('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(true)
  const { plans, plansLoading, plansError, refreshPlans } = usePlans()
  const { contracts } = useContracts()
  const createContractMutation = useCreateContractMutation()
  const createContractWithPaymentMutation = useCreateContractWithPaymentMutation()
  const contractLoading = createContractMutation.isPending
  const paymentLoading = createContractWithPaymentMutation.isPending
  const contractError = createContractMutation.error?.message
  const { refreshBalance } = useUserBalance()

  const plan = plans.find((p: Plano) => p.id === Number(planId))
  const activeContract = contracts.find((c: Contract) => c.status === 'active')
  const isPlanChange = !!(
    activeContract &&
    activeContract.plan &&
    activeContract.plan.id !== Number(planId)
  )
  const userData = getAuthenticatedUserData(user)
  const { creditInfo, isLoading: isCalculatingCredits } = usePlanCredits(
    activeContract || undefined,
    plan || undefined,
    userData ? userData.id : (user?.id ?? 0)
  )
  useEffect(() => {
    if (!user?.id) return
    if (!userData) return
    setIsLoadingDetails(false)
  }, [user?.id, userData])

  // Carregamento inicial de dados - apenas quando necessário
  useEffect(() => {
    if (user?.id && userData && plans.length === 0) {
      const loadInitialData = async () => {
        try {
          await Promise.all([
            refreshPlans(),
            refreshBalance()
          ])
        } catch (error) {
          // eslint-disable-next-line no-console
          console.warn('Erro ao carregar dados iniciais:', error)
        }
      }

      loadInitialData()
    }
  }, [user?.id, userData, plans.length, refreshPlans, refreshBalance])
  const isBasicDataReady = useMemo(() => {
    if (plansLoading) return false
    if (isLoadingDetails) return false
    if (!plan) return false
    return true
  }, [plansLoading, isLoadingDetails, plan])
  const isCreditCalculationReady = useMemo(() => {
    if (!isPlanChange) return true
    return !isCalculatingCredits
  }, [isPlanChange, isCalculatingCredits])
  const currentBalance = 0

  const handleConfirmPayment = async () => {
    if (!plan) return
    if (!planId || isNaN(Number(planId))) return
    if (!userData) return

    setIsProcessing(true)

    if (isPlanChange && activeContract) {
      // eslint-disable-next-line no-console
      console.log('🔄 Iniciando mudança de plano:', {
        contractId: activeContract.id,
        currentPlanId: activeContract.plan?.id,
        newPlanId: plan.id,
        planDescription: plan.description
      })

      // Usa o serviço de API para mudança de plano
      const result = await changePlan({
        contractId: activeContract.id,
        newPlanId: plan.id
      })

      if (!result) {
        // eslint-disable-next-line no-console
        console.error('❌ Erro na mudança de plano - resultado vazio')
        throw new Error('Erro ao fazer mudança de plano')
      }

      // eslint-disable-next-line no-console
      console.log('✅ Mudança de plano processada com sucesso:', result)
    } else {
      const today = new Date()
      const endDateISO = calculateContractEndDate(today)

      let finalAmount: number
      let discountApplied: number = 0
      let proratedOld: number = 0
      let proratedNew: number = 0
      let appliedCredits: number = 0

      if (isPlanChange && creditInfo) {
        finalAmount = creditInfo.final_price
        proratedOld = creditInfo.prorated_discount || 0
        proratedNew = creditInfo.prorated_new || 0
        appliedCredits = creditInfo.discount || 0
        discountApplied = proratedOld + proratedNew + appliedCredits
      } else {
        finalAmount = Math.max(0, plan.price - currentBalance)
        appliedCredits = currentBalance
        discountApplied = appliedCredits
      }

      if (finalAmount <= 0) {
        finalAmount = 0
      }
      finalAmount = Math.round(finalAmount * 100) / 100

      const contractWithPaymentData = {
        user_id: userData.id,
        plan_id: plan.id,
        start_date: today.toISOString().split('T')[0],
        end_date: endDateISO.split('T')[0],
        amount: finalAmount,
        payment_date: new Date().toISOString().split('T')[0],
        status: 'paid',
        discount_applied: discountApplied,
        prorated_old: proratedOld,
        prorated_new: proratedNew,
        applied_credits: appliedCredits
      }

      const result = await createContractWithPaymentMutation.mutateAsync(contractWithPaymentData)

      if (!result) {
        throw new Error('Erro ao criar contrato com pagamento')
      }

      if (result.payment) {
        if (userData.id) {
          // eslint-disable-next-line no-console
          console.log('✅ Pagamento processado com sucesso:', result)

          // Usa invalidação otimizada após pagamento
          try {
            await Promise.all([
              refreshPlans(),
              refreshBalance()
            ])

            // eslint-disable-next-line no-console
            console.log('✅ Dados atualizados após pagamento')
          } catch (refreshError) {
            // eslint-disable-next-line no-console
            console.warn('⚠️ Erro ao atualizar dados após pagamento:', refreshError)
            // Não falha o processo por erro de refresh
          }
        }
      } else if (finalAmount > 0) {
        // eslint-disable-next-line no-console
        console.error('❌ Falha no processamento do pagamento - resultado:', result)
        throw new Error('Falha no processamento do pagamento')
      }
    }

    // eslint-disable-next-line no-console
    console.log('⏳ Iniciando período de processamento mínimo...')
    const minimumProcessingTime = 3000
    const startTime = Date.now()

    const remainingTime = minimumProcessingTime - (Date.now() - startTime)
    if (remainingTime > 0) {
      await new Promise(resolve => setTimeout(resolve, remainingTime))
    }

    // eslint-disable-next-line no-console
    console.log('✅ Processamento concluído, redirecionando...')
    navigate('/?success=payment')
  }

  if (plansLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    )
  }

  if (plansError || contractError || !plan) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-lg">
          Erro: {plansError || contractError || 'Plano não encontrado'}
        </div>
      </div>
    )
  }
  if (!isBasicDataReady) {
    return (
      <Layout user={userData}>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-orange-400 text-3xl font-bold text-center mb-8">
            {plansLoading ? 'Carregando Planos...' : 'Carregando Dados do Pagamento...'}
          </h1>
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <LoadingSpinner className="mx-auto mb-4 h-8 w-8" />
              <p className="text-gray-600">
                {plansLoading
                  ? 'Carregando informações dos planos disponíveis...'
                  : 'Carregando contratos e saldo do usuário...'}
              </p>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout user={user ? { id: user.id, name: user.name } : { id: 1, name: 'Usuário Teste' }}>
      <PaymentErrorBoundary>
        <Modal isOpen={isProcessing} onClose={() => {}} closeOnBackdropClick={false} size="sm">
          <div className="text-center p-6">
            <LoadingSpinner className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold">Processando Pagamento...</h2>
            <p className="text-gray-600 mt-2">
              Aguarde um momento, estamos confirmando tudo para você.
            </p>
          </div>
        </Modal>

        <div className="container mx-auto px-4 py-8">
          <h1 className="text-orange-400 text-3xl font-bold text-center mb-8">Pagamento</h1>

          <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6 border border-gray-200">
            <h2 className="text-xl font-semibold mb-4">
              {isPlanChange ? 'Troca de Plano' : `Assinatura: ${plan.description}`}
            </h2>

            {isPlanChange && activeContract && activeContract.plan && (
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <h3 className="font-semibold text-blue-800">Plano Atual</h3>
                <p className="text-blue-700">
                  {activeContract.plan.description} - {formatCurrency(activeContract.plan.price)}/mês
                </p>
              </div>
            )}

            <div className="mb-4 p-3 bg-green-50 rounded">
              <h3 className="font-semibold text-green-800">
                {isPlanChange ? 'Novo Plano' : 'Plano Selecionado'}
              </h3>
              <p className="text-green-700">
                {plan.description} - {formatCurrency(plan.price)}/mês
              </p>
            </div>
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Descontos:</h3>

              {!isCreditCalculationReady ? (
                <div className="p-4 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                  <LoadingSpinner
                    size="sm"
                    message="Calculando descontos proporcionais..."
                    className="text-gray-600"
                    centered={true}
                  />
                </div>
              ) : creditInfo && isPlanChange ? (
                <PlanChangeDetails
                  creditInfo={{
                    databaseCredits: creditInfo.database_credits,
                    proratedDiscount: creditInfo.prorated_discount,
                    proratedNew: creditInfo.prorated_new,
                    finalPrice: creditInfo.final_price,
                    proratedOld: creditInfo.prorated_old
                  }}
                  formatCurrency={formatCurrency}
                  showToCredit={true}
                />
              ) : isPlanChange ? (
                <div className="p-3 bg-blue-50 rounded border border-blue-200 text-center text-blue-700 text-sm">
                  Aguardando cálculo de descontos proporcionais...
                </div>
              ) : currentBalance > 0 ? (
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-green-700">Saldo em Crédito: {formatCurrency(currentBalance)}</p>
                  <p className="text-green-700 font-bold">
                    Valor Final: {formatCurrency(Math.max(0, plan.price - currentBalance))}
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 rounded text-center text-gray-500 text-sm">
                  Nenhum desconto aplicável
                </div>
              )}
            </div>
            {!isPlanChange && currentBalance === 0 && (
              <p className="text-lg font-bold mb-4">Preço: {formatCurrency(plan.price)}</p>
            )}
            {(() => {
              let finalAmount = 0
              if (creditInfo && isPlanChange) {
                finalAmount = creditInfo.final_price
              } else {
                finalAmount = Math.max(0, plan.price - currentBalance)
              }
              return finalAmount > 0 ? (
                <div className="mb-6 text-center">
                  <h3 className="text-lg font-medium mb-4">Pague com PIX</h3>

                  {pixPayload && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-2">
                        Código PIX (copia e cola):
                      </label>
                      <textarea
                        readOnly
                        value={pixPayload}
                        className="w-full p-2 border rounded text-xs font-mono bg-gray-50"
                        rows={4}
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(pixPayload)}
                        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Copiar Código PIX
                      </button>
                    </div>
                  )}

                  <div className="p-4 border inline-block rounded-lg">
                    {(() => {
                      const pixAmount = finalAmount
                      return (
                        <Pix
                          pixkey={'33208898000147'} // Chave de email válida para teste
                          merchant={'Inmediam'} // Sem acentos
                          city={'SAO PAULO'}
                          amount={parseFloat(String(pixAmount))}
                          size={192}
                          onLoad={(payload: string) => {
                            setPixPayload(payload)
                          }}
                        />
                      )
                    })()}
                  </div>
                </div>
              ) : null
            })()}
            <button
              onClick={handleConfirmPayment}
              disabled={contractLoading || paymentLoading || isProcessing}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Processando Pagamento...
                </>
              ) : contractLoading || paymentLoading ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Criando Contrato...
                </>
              ) : (
                'Confirmar Pagamento'
              )}
            </button>
          </div>
        </div>
      </PaymentErrorBoundary>
    </Layout>
  )
}
