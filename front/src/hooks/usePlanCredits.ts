import { useState, useEffect, useRef } from "react";
import { Contract } from "../types";
import { CreditCalculator, CreditCalculationResult } from "../services/creditCalculator";
import { useUserCredits } from "./useUserCredits";

/**
 * Hook para obter informações de crédito para mudança de plano
 * Segue princípio SRP - responsabilidade única: gerenciar estado de créditos
 * Usa o padrão de composição com useUserCredits
 */
export function usePlanCredits(
  activeContract: Contract | undefined,
  selectedPlan: { id: number; price: number } | undefined,
  userId: number
) {
  const [creditInfo, setCreditInfo] = useState<CreditCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Usa o hook padronizado para buscar créditos
  const { credits: databaseCredits, loading: creditsLoading } = useUserCredits(userId);

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
        // Usa o CreditCalculator para calcular informações de crédito
        const result = CreditCalculator.calculateCreditInfo(
          activeContract,
          selectedPlan,
          databaseCredits
        );

        setCreditInfo(result);
      } catch (error) {
        // Não logar erro se foi abortado (cancelamento intencional)
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Erro ao calcular créditos:', error);
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
  }, [activeContract, selectedPlan, userId, databaseCredits]);

  return { creditInfo, isLoading: isLoading || creditsLoading };
}
