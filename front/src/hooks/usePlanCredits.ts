import { useState, useEffect, useRef, useMemo } from "react";
import { Contract } from "../types";
import { CreditCalculator, CreditCalculationResult } from "../services/creditCalculator";

/**
 * Hook otimizado para obter informações de crédito para mudança de plano
 * Implementa cache e debouncing para evitar loops infinitos
 */
export function usePlanCredits(
  activeContract: Contract | undefined,
  selectedPlan: { id: number; price: number } | undefined,
  userId: number
) {
  const [creditInfo, setCreditInfo] = useState<CreditCalculationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const calculationCacheRef = useRef<Map<string, CreditCalculationResult>>(new Map());
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastCalculationRef = useRef<string>("");

  // Chave de cache baseada nos parâmetros
  const cacheKey = useMemo(() => {
    if (!activeContract || !selectedPlan) return null;
    return `${activeContract.id}-${selectedPlan.id}-${userId}`;
  }, [activeContract, selectedPlan, userId]);

  useEffect(() => {
    // Se não há parâmetros válidos, limpar resultado
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

    // Verificar se já calculamos isso recentemente
    const currentParams = `${activeContract.id}-${selectedPlan.id}-${userId}`;
    if (lastCalculationRef.current === currentParams) {
      return; // Já calculamos isso, ignorar
    }

    // Verificar cache primeiro
    if (cacheKey && calculationCacheRef.current.has(cacheKey)) {
      const cachedResult = calculationCacheRef.current.get(cacheKey)!;
      setCreditInfo(cachedResult);
      lastCalculationRef.current = currentParams;
      return;
    }

    // Debouncing para evitar múltiplas execuções
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      const calculateCredits = async () => {
        // Verificação dupla após debounce
        if (lastCalculationRef.current === currentParams) {
          return; // Já foi calculado
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
          // Buscar créditos apenas uma vez (sem hook separado para evitar loops)
          const balanceResponse = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
          if (!balanceResponse.ok) {
            throw new Error(`HTTP ${balanceResponse.status}`);
          }
          const balanceData = await balanceResponse.json();
          const databaseCredits = balanceData.total_balance || 0;

          // Usa o CreditCalculator para calcular informações de crédito
          const result = CreditCalculator.calculateCreditInfo(
            activeContract,
            selectedPlan,
            databaseCredits
          );

          // Cache do resultado
          if (cacheKey) {
            calculationCacheRef.current.set(cacheKey, result);
          }

          lastCalculationRef.current = currentParams;
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

      calculateCredits();
    }, 300); // Debounce de 300ms

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [cacheKey, activeContract, selectedPlan, userId]);

  return { creditInfo, isLoading };
}
