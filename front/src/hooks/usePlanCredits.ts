import { useState, useEffect, useRef } from "react";
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
    proratedNew: number;
    availableCredits: number;
    finalPrice: number;
    discount: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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
        setIsLoading(false);
        return;
      }

      // Cancelar request anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Criar novo AbortController para este request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsLoading(true);

      try {
        // Buscar saldo do banco de dados (vem em reais)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`, {
          signal: abortController.signal
        });
        const data = await response.json();
        const databaseCredits = Number(data.total_balance) || 0; // em reais

        // Saldo já vem em reais do backend
        const databaseCreditsInReais = databaseCredits;

        // Calcular desconto pro-rata em reais
        const now = moment().tz('America/Sao_Paulo');
        const startDate = moment(activeContract.start_date).tz('America/Sao_Paulo');
        const daysDiff = now.diff(startDate, 'days');

        // Crédito proporcional em reais (assumindo mês de 30 dias)
        let proratedDiscount: number;
        if (daysDiff === 0) {
          // Se contratado hoje, desconto é 100%
          proratedDiscount = Number(activeContract.plan.price) || 0;
        } else if (daysDiff < 30) {
          proratedDiscount = (Number(activeContract.plan.price) / 30) * (30 - daysDiff);
        } else {
          proratedDiscount = 0;
        }

        // Garantir que proratedDiscount seja um número válido
        proratedDiscount = isNaN(proratedDiscount) ? 0 : proratedDiscount;

        // Total de créditos disponíveis (saldo em conta + pro-rata) em reais
        const totalAvailableCredits = databaseCreditsInReais + proratedDiscount;

        // CORREÇÃO: Plano novo sempre usa valor cheio (não proporcional)
        // pois representa o valor base para comparação com créditos disponíveis
        const proratedNew = Number(selectedPlan.price); // Sempre valor cheio

        // Valor final do novo plano com desconto de créditos em reais
        const selectedPrice = Number(selectedPlan.price) || 0;
        const finalPrice = Math.max(0, selectedPrice - totalAvailableCredits);
        const discount = Math.min(selectedPrice, totalAvailableCredits);

        // Garantir que valores sejam números válidos
        const safeFinalPrice = isNaN(finalPrice) ? 0 : finalPrice;
        const safeProratedNew = isNaN(proratedNew) ? 0 : proratedNew;

        setCreditInfo({
          databaseCredits: databaseCreditsInReais,
          proratedDiscount: proratedDiscount,
          proratedNew: safeProratedNew,
          availableCredits: totalAvailableCredits,
          finalPrice: safeFinalPrice,
          discount: discount,
        });
      } catch (error) {
        // Não logar erro se foi abortado (cancelamento intencional)
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Erro ao buscar créditos:', error);
          setCreditInfo(null);
        }
      } finally {
        setIsLoading(false);
        // Limpar referência se este foi o request cancelado
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    fetchCreditsAndCalculate();

    // Cleanup function para cancelar request quando componente desmonta ou dependências mudam
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeContract, selectedPlan, userId]);

  return { creditInfo, isLoading };
}
