import moment from 'moment-timezone'
import { Contract } from '../types'

/**
 * Serviço responsável por cálculos de crédito e desconto
 */
export interface CreditCalculationResult {
  databaseCredits: number
  proratedDiscount: number
  proratedOld: number
  proratedNew: number
  availableCredits: number
  finalPrice: number
  discount: number
}

export class CreditCalculator {
  /**
   * Calcula informações de crédito para mudança de plano
   */
  static calculateCreditInfo(
    activeContract: Contract,
    selectedPlan: { id: number; price: number },
    databaseCredits: number
  ): CreditCalculationResult {
    const databaseCreditsInReais = databaseCredits
    const proratedDiscount = this.calculateProratedDiscount(activeContract)
    const totalAvailableCredits = databaseCreditsInReais + proratedDiscount
    const proratedNew = Number(selectedPlan.price)
    const selectedPrice = Number(selectedPlan.price) || 0
    const finalPrice = Math.max(0, selectedPrice - totalAvailableCredits)
    const discount = Math.min(selectedPrice, totalAvailableCredits)

    return {
      databaseCredits: databaseCreditsInReais,
      proratedDiscount: proratedDiscount,
      proratedOld: Number(activeContract.plan.price),
      proratedNew: proratedNew,
      availableCredits: totalAvailableCredits,
      finalPrice: finalPrice,
      discount: discount
    }
  }

  /**
   * Calcula desconto proporcional baseado na data de início do contrato
   */
  private static calculateProratedDiscount(contract: Contract): number {
    if (!contract.start_date || !contract.plan) {
      return 0
    }

    const now = moment().tz('America/Sao_Paulo')
    const startDate = moment(contract.start_date).tz('America/Sao_Paulo')
    const daysDiff = now.diff(startDate, 'days')

    if (daysDiff === 0) {
      return Number(contract.plan.price) || 0
    } else if (daysDiff < 30) {
      return (Number(contract.plan.price) / 30) * (30 - daysDiff)
    } else {
      return 0
    }
  }
}
