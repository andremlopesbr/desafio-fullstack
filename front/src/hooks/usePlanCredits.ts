import { useState, useEffect } from "react";
import { Contract } from "../types";
import moment from "moment-timezone";

export function usePlanCredits(
  activeContract: Contract | undefined,
  selectedPlan: { id: number; price: number } | undefined,
  userId: number
) {
  const [creditInfo, setCreditInfo] = useState<{
    databaseCredits: number;
    proratedDiscount: number;
    availableCredits: number;
    finalPrice: number;
    discount: number;
  } | null>(null);

  useEffect(() => {
    const fetchCreditsAndCalculate = async () => {
      if (
        !activeContract ||
        !selectedPlan ||
        !activeContract.start_date ||
        !activeContract.plan ||
        !userId
      ) {
        setCreditInfo(null);
        return;
      }

      try {
        // Buscar saldo do banco de dados
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
        const data = await response.json();
        const databaseCredits = data.total_balance || 0;

        // Calcular desconto pro-rata exatamente como na API do ContractService
        const now = moment().tz('America/Sao_Paulo');
        const startDate = moment(activeContract.start_date).tz('America/Sao_Paulo');
        const daysDiff = now.diff(startDate, 'days');

        // Crédito proporcional em centavos (assumindo mês de 30 dias)
        let proratedDiscount: number;
        if (daysDiff === 0) {
          // Se contratado hoje, desconto é 100%
          proratedDiscount = activeContract.plan.price;
        } else if (daysDiff < 30) {
          proratedDiscount = Math.floor((activeContract.plan.price / 30) * (30 - daysDiff));
        } else {
          proratedDiscount = 0;
        }

        // Total de créditos disponíveis (saldo em conta + pro-rata) em centavos
        const totalAvailableCredits = databaseCredits + proratedDiscount;

        // Valor final do novo plano com desconto de créditos em centavos
        const finalPrice = Math.max(0, selectedPlan.price - totalAvailableCredits);
        const discount = Math.min(selectedPlan.price, totalAvailableCredits);

        setCreditInfo({
          databaseCredits: databaseCredits / 100,
          proratedDiscount: proratedDiscount / 100,
          availableCredits: totalAvailableCredits / 100,
          finalPrice: finalPrice / 100,
          discount: discount / 100,
        });
      } catch (error) {
        console.error('Erro ao buscar créditos:', error);
        setCreditInfo(null);
      }
    };

    fetchCreditsAndCalculate();
  }, [activeContract, selectedPlan, userId]);

  return creditInfo;
}
