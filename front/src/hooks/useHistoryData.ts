import { useCallback, useMemo } from 'react';
import { useContracts } from './useContracts';
import { usePayments } from './usePayments';
import { Payment } from '../types';


export function useHistoryData(userId: number) {
  const { contracts, contractsLoading, contractsError, refetch: refetchContracts } = useContracts();
  const { payments, paymentsLoading, paymentsError, refetch: refetchPayments } = usePayments(userId);

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
     console.log('🔍 DEBUG useHistoryData - Iniciando combinação de dados');
     console.log('Contratos recebidos:', sortedContracts.length);
     console.log('Pagamentos recebidos:', payments.length);

     if (!sortedContracts.length || !payments.length) {
       console.log('⚠️ DEBUG useHistoryData - Sem contratos ou pagamentos para combinar');
       return [];
     }

    // Criar mapa de pagamentos por contract_id para acesso O(1)
    const paymentsMap = new Map<number, Payment[]>();
    console.log('🔍 DEBUG useHistoryData - Criando mapa de pagamentos');
    payments.forEach((payment: Payment) => {
      const contractId = payment.contract_id;
      console.log(`Pagamento ID ${payment.id} -> Contract ID ${contractId}`);
      if (!paymentsMap.has(contractId)) {
        paymentsMap.set(contractId, []);
      }
      paymentsMap.get(contractId)!.push(payment);
    });

    console.log('🔍 DEBUG useHistoryData - Mapa de pagamentos criado');
    console.log('Total de contratos únicos com pagamentos:', paymentsMap.size);

    // Mapear contratos com seus pagamentos
    const result = sortedContracts.map(contract => {
      const contractPayments = paymentsMap.get(contract.id) || [];
      console.log(`🔍 DEBUG useHistoryData - Contrato ${contract.id} (${contract.plan.description}) -> ${contractPayments.length} pagamentos`);
      return {
        contract,
        payments: contractPayments
      };
    });

    console.log('✅ DEBUG useHistoryData - Combinação finalizada');
    console.log(`Total de itens no histórico: ${result.length}`);
    return result;
  }, [sortedContracts, payments]);

  const refetch = useCallback(async () => {
    // Usa os métodos de refetch dos hooks individuais para uma atualização mais eficiente
    await Promise.all([
      refetchContracts(),
      refetchPayments()
    ]);
  }, [refetchContracts, refetchPayments]);

  return {
    historyItems,
    loading,
    error,
    refetch,
    contractsCount: contracts.length,
    paymentsCount: payments.length
  };
}