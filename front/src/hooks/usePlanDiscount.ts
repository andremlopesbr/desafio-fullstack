import { useState, useEffect } from 'react';
import { Contract } from '../types';

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
    databaseCredits: number;
    proratedDiscount: number;
    availableCredits: number;
    finalPrice: number;
    discount: number;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateDiscount = async () => {
      if (
        !activeContract ||
        !selectedPlan ||
        !activeContract.start_date ||
        !activeContract.plan ||
        !userId
      ) {
        setDiscountData(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Buscar saldo do banco de dados
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
        if (!response.ok) {
          throw new Error('Falha ao buscar saldo do usuário');
        }
        const data = await response.json();
        const databaseCredits = data.total_balance || 0;

        // Calcular desconto pro-rata exatamente como na API do ContractService
        const now = new Date();
        const startDate = new Date(activeContract.start_date!);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 30); // Adiciona 30 dias como na API

        let daysRemaining = 0;
        if (endDate > now) {
          // Calcular diferença em dias (equivalente ao diffInDays do Carbon)
          const diffTime = endDate.getTime() - now.getTime();
          daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }

        // Cálculo proporcional exato da API: (int) round(daysRemaining * (price / 30))
        const oldPlanDailyPrice = activeContract.plan.price / 30;
        const proratedDiscount = daysRemaining > 0 ? Math.round(daysRemaining * oldPlanDailyPrice) : 0;

        // Total de créditos disponíveis (saldo em conta + pro-rata)
        const totalAvailableCredits = databaseCredits + proratedDiscount;

        // Valor final do novo plano com desconto de créditos
        const finalPrice = Math.max(0, selectedPlan.price - totalAvailableCredits);
        const discount = Math.min(selectedPlan.price, totalAvailableCredits);

        setDiscountData({
          databaseCredits: Math.round(databaseCredits * 100) / 100,
          proratedDiscount: Math.round(proratedDiscount * 100) / 100,
          availableCredits: Math.round(totalAvailableCredits * 100) / 100,
          finalPrice: Math.round(finalPrice * 100) / 100,
          discount: Math.round(discount * 100) / 100,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
        console.error('Erro ao calcular desconto:', errorMsg);
        setError(errorMsg);
        setDiscountData(null);
      } finally {
        setLoading(false);
      }
    };

    calculateDiscount();
  }, [activeContract, selectedPlan, userId]);

  return {
    data: discountData,
    loading,
    error,
    refetch: () => {
      // Re-executar o cálculo
      if (activeContract && selectedPlan && userId) {
        const calculateDiscount = async () => {
          setLoading(true);
          setError(null);
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
            if (!response.ok) {
              throw new Error('Falha ao buscar saldo do usuário');
            }
            const data = await response.json();
            const databaseCredits = data.total_balance || 0;

            const now = new Date();
            const startDate = new Date(activeContract.start_date!);
            const endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 30);

            let daysRemaining = 0;
            if (endDate > now) {
              const diffTime = endDate.getTime() - now.getTime();
              daysRemaining = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }

            const oldPlanDailyPrice = activeContract.plan.price / 30;
            const proratedDiscount = daysRemaining > 0 ? Math.round(daysRemaining * oldPlanDailyPrice) : 0;
            const totalAvailableCredits = databaseCredits + proratedDiscount;
            const finalPrice = Math.max(0, selectedPlan.price - totalAvailableCredits);
            const discount = Math.min(selectedPlan.price, totalAvailableCredits);

            setDiscountData({
              databaseCredits: Math.round(databaseCredits * 100) / 100,
              proratedDiscount: Math.round(proratedDiscount * 100) / 100,
              availableCredits: Math.round(totalAvailableCredits * 100) / 100,
              finalPrice: Math.round(finalPrice * 100) / 100,
              discount: Math.round(discount * 100) / 100,
            });
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(errorMsg);
            setDiscountData(null);
          } finally {
            setLoading(false);
          }
        };
        calculateDiscount();
      }
    }
  };
}