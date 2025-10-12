import moment from "moment-timezone";
import { Contract } from "../types";

/**
 * Serviço responsável por cálculos de crédito e desconto
 * Segue princípio SRP - responsabilidade única: calcular créditos
 */
export interface CreditCalculationResult {
  databaseCredits: number;
  proratedDiscount: number;
  proratedOld: number; // ✅ Valor total disponível do pro-rata (DEBUG.md)
  proratedNew: number;
  availableCredits: number;
  finalPrice: number;
  discount: number;
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
    // Saldo já vem em reais do backend
    const databaseCreditsInReais = databaseCredits;

    // Calcular desconto pro-rata em reais
    const proratedDiscount = this.calculateProratedDiscount(activeContract);

    // Total de créditos disponíveis (saldo em conta + pro-rata) em reais
    const totalAvailableCredits = databaseCreditsInReais + proratedDiscount;

    // Plano novo sempre usa valor cheio
    const proratedNew = Number(selectedPlan.price);

    // Valor final do novo plano com desconto de créditos em reais
    const selectedPrice = Number(selectedPlan.price) || 0;
    const finalPrice = Math.max(0, selectedPrice - totalAvailableCredits);
    const discount = Math.min(selectedPrice, totalAvailableCredits);

    return {
      databaseCredits: databaseCreditsInReais,
      proratedDiscount: proratedDiscount,
      proratedOld: Number(activeContract.plan.price), // ✅ Valor total do plano antigo (DEBUG.md)
      proratedNew: proratedNew,
      availableCredits: totalAvailableCredits,
      finalPrice: finalPrice,
      discount: discount,
    };
  }

  /**
   * Calcula desconto proporcional baseado na data de início do contrato
   */
  private static calculateProratedDiscount(contract: Contract): number {
    if (!contract.start_date || !contract.plan) {
      return 0;
    }

    const now = moment().tz('America/Sao_Paulo');
    const startDate = moment(contract.start_date).tz('America/Sao_Paulo');
    const daysDiff = now.diff(startDate, 'days');

    if (daysDiff === 0) {
      // Se contratado hoje, desconto é 100%
      return Number(contract.plan.price) || 0;
    } else if (daysDiff < 30) {
      // Crédito proporcional em reais (assumindo mês de 30 dias)
      return (Number(contract.plan.price) / 30) * (30 - daysDiff);
    } else {
      return 0;
    }
  }
}