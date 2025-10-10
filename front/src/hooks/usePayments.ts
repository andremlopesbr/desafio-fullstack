import { createApiHook } from './useApiHooksFactory';
import { useApiMutation } from './useApiMutation';

export const usePayments = createApiHook('payments', undefined, 'payments');

/**
 * Hook para processamento de pagamentos
 * Usa padrão de mutação seguindo SRP
 */
export function useProcessPayment() {
  const { data, loading, error, execute } = useApiMutation();

  const processPayment = async (data: {
    contract_id: number;
    amount: number;
    payment_date: string;
    status?: string;
  }) => {
    return execute('/payments', { method: 'POST' }, data);
  };

  return { processPayment, data, loading, error };
}