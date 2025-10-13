import { useContext } from 'react';
import { PaymentsContext } from '../contexts/PaymentsContext';
import { AuthContext } from '../contexts/AuthContext';
import { useApiMutation } from './useApiMutation';

export const usePayments = (userId?: number) => {
  const paymentsContext = useContext(PaymentsContext);
  const authContext = useContext(AuthContext);

  if (!paymentsContext) {
    throw new Error('usePayments deve ser usado dentro de um PaymentsProvider');
  }

  if (!authContext) {
    throw new Error('usePayments deve ser usado dentro de um AuthProvider');
  }

  const targetUserId = userId || authContext.user?.id;

  if (!targetUserId) {
    return {
      payments: [],
      paymentsLoading: false,
      paymentsError: null,
      refreshPayments: () => {},
      refetch: () => {}
    };
  }

  const refreshPayments = async () => {
    await paymentsContext.refreshPayments(targetUserId);
  };

  return {
    payments: paymentsContext.payments,
    paymentsLoading: paymentsContext.loading,
    paymentsError: paymentsContext.error,
    refreshPayments,
    refetch: refreshPayments
  };
};

/**
 * Hook para processamento de pagamentos
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