import { useState, useEffect } from 'react'
import { Contract } from '../types'
import moment from 'moment-timezone'

/**
 * Hook para calcular desconto de troca de plano seguindo a lógica da API
 * Retorna dados padronizados como os hooks do módulo de pagamento
 */
export function usePlanDiscount(
  activeContract: Contract | undefined,
  selectedPlan: { id: number; price: number } | undefined,
  userId: number
) {
  const [discountData, setDiscountData] = useState<{
    databaseCredits: number
    proratedDiscount: number
    availableCredits: number
    finalPrice: number
    discount: number
  } | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    const calculateDiscount = async () => {
      if (
        !activeContract ||
        !selectedPlan ||
        !activeContract.start_date ||
        !activeContract.plan ||
        !userId
      ) {
        setDiscountData(null)
        setError(undefined)
        return
      }

      setLoading(true)
      setError(undefined)

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`)
        if (!response.ok) {
          throw new Error('Falha ao buscar saldo do usuário')
        }
        const data = await response.json()
        const databaseCredits = data.total_balance || 0
        const now = moment().tz('America/Sao_Paulo')
        const startDate = moment(activeContract.start_date).tz('America/Sao_Paulo')
        const daysDiff = now.diff(startDate, 'days')
        let proratedDiscount: number
        if (daysDiff === 0) {
          proratedDiscount = activeContract.plan.price
        } else if (daysDiff < 30) {
          proratedDiscount =
            Math.floor((activeContract.plan.price / 30) * (30 - daysDiff) * 100) / 100
        } else {
          proratedDiscount = 0
        }
        const totalAvailableCredits = databaseCredits + proratedDiscount
        const finalPrice = Math.max(0, selectedPlan.price - totalAvailableCredits)
        const discount = Math.min(selectedPlan.price, totalAvailableCredits)

        setDiscountData({
          databaseCredits: Math.floor(databaseCredits * 100) / 100,
          proratedDiscount: Math.floor(proratedDiscount * 100) / 100,
          availableCredits: Math.floor(totalAvailableCredits * 100) / 100,
          finalPrice: Math.floor(finalPrice * 100) / 100,
          discount: Math.floor(discount * 100) / 100
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
        setError(errorMsg)
        setDiscountData(null)
      } finally {
        setLoading(false)
      }
    }

    calculateDiscount()
  }, [activeContract, selectedPlan, userId])

  return {
    data: discountData,
    loading,
    error,
    refetch: () => {
      if (activeContract && selectedPlan && userId) {
        const calculateDiscount = async () => {
          setLoading(true)
          setError(undefined)
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`)
            if (!response.ok) {
              throw new Error('Falha ao buscar saldo do usuário')
            }
            const data = await response.json()
            const databaseCredits = data.total_balance || 0

            const now = moment().tz('America/Sao_Paulo')
            const startDate = moment(activeContract.start_date).tz('America/Sao_Paulo')
            const daysDiff = now.diff(startDate, 'days')

            let proratedDiscount: number
            if (daysDiff === 0) {
              proratedDiscount = activeContract.plan.price
            } else if (daysDiff < 30) {
              proratedDiscount =
                Math.floor((activeContract.plan.price / 30) * (30 - daysDiff) * 100) / 100
            } else {
              proratedDiscount = 0
            }
            const totalAvailableCredits = databaseCredits + proratedDiscount

            const finalPrice = Math.max(0, selectedPlan.price - totalAvailableCredits)
            const discount = Math.min(selectedPlan.price, totalAvailableCredits)

            setDiscountData({
              databaseCredits: Math.floor(databaseCredits * 100) / 100,
              proratedDiscount: Math.floor(proratedDiscount * 100) / 100,
              availableCredits: Math.floor(totalAvailableCredits * 100) / 100,
              finalPrice: Math.floor(finalPrice * 100) / 100,
              discount: Math.floor(discount * 100) / 100
            })
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
            setError(errorMsg)
            setDiscountData(null)
          } finally {
            setLoading(false)
          }
        }
        calculateDiscount()
      }
    }
  }
}
