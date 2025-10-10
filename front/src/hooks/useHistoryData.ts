import { useCallback, useMemo } from 'react';
import { useContracts } from './useContracts';
import { usePayments } from './usePayments';
import { Payment } from '../types';


export function useHistoryData(userId: number) {
  const { contracts, contractsLoading, contractsError } = useContracts();
  const { payments, loading: paymentsLoading, error: paymentsError } = usePayments(userId);

  const loading = contractsLoading || paymentsLoading;
  const error = contractsError || paymentsError;

  // Ordenar contratos: plano ativo primeiro, depois por data de criação descendente
  const sortedContracts = useMemo(() => {
    if (!contracts.length) return [];

    return [...contracts].sort((a, b) => {
      // Priorizar plano ativo
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      // Para contratos não ativos ou ambos ativos, ordenar por data descendente
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [contracts]);

  // Combinar contratos com seus pagamentos de forma otimizada
  const historyItems = useMemo(() => {
    if (!sortedContracts.length || !payments.length) {
      return [];
    }

    // Criar mapa de pagamentos por contract_id para acesso O(1)
    const paymentsMap = new Map<number, Payment[]>();
    payments.forEach((payment: Payment) => {
      const contractId = payment.contract_id;
      if (!paymentsMap.has(contractId)) {
        paymentsMap.set(contractId, []);
      }
      paymentsMap.get(contractId)!.push(payment);
    });

    // Mapear contratos com seus pagamentos
    return sortedContracts.map(contract => ({
      contract,
      payments: paymentsMap.get(contract.id) || []
    }));
  }, [sortedContracts, payments]);

  const refetch = useCallback(() => {
    // Os hooks individuais já têm seus próprios métodos de refetch
    // Podemos adicionar lógica específica se necessário
    window.location.reload(); // Solução temporária
  }, []);

  return {
    historyItems,
    loading,
    error,
    refetch,
    contractsCount: contracts.length,
    paymentsCount: payments.length
  };
}