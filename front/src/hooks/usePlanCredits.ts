import { useState, useEffect } from "react";
import { Contract } from "../types";

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

        // Calcular desconto pro-rata baseado em dias não utilizados
        const now = new Date();
        const startDate = new Date(activeContract.start_date);
        const daysDiff = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

        // Crédito proporcional (assumindo mês de 30 dias)
        const proratedDiscount = daysDiff < 30
          ? (activeContract.plan.price / 30) * (30 - daysDiff)
          : 0;

        // Total de créditos disponíveis (saldo em conta + pro-rata)
        const totalAvailableCredits = databaseCredits + proratedDiscount;

        // Valor final do novo plano com desconto de créditos
        const finalPrice = Math.max(0, selectedPlan.price - totalAvailableCredits);
        const discount = Math.min(selectedPlan.price, totalAvailableCredits);

        setCreditInfo({
          databaseCredits: Math.round(databaseCredits * 100) / 100,
          proratedDiscount: Math.round(proratedDiscount * 100) / 100,
          availableCredits: Math.round(totalAvailableCredits * 100) / 100,
          finalPrice: Math.round(finalPrice * 100) / 100,
          discount: Math.round(discount * 100) / 100,
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
