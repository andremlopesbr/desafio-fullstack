import { useEffect, useState, useRef } from 'react';
import { useApiData } from './useApiData';

export function usePayments(userId: number) {
  const { payments, paymentsLoading, paymentsError, refreshPayments } = useApiData();
  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (userId && !paymentsLoading && (!hasFetchedRef.current || lastUserIdRef.current !== userId)) {
      hasFetchedRef.current = true;
      lastUserIdRef.current = userId;
      refreshPayments(userId);
    }
  }, [userId, paymentsLoading, refreshPayments]);

  return {
    payments,
    loading: paymentsLoading,
    error: paymentsError,
    refetch: () => refreshPayments(userId)
  };
}

export function useProcessPayment() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processPayment = async (data: {
    contract_id: number;
    amount: number;
    payment_date: string;
    status?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to process payment');
      const payment = await response.json();
      return payment;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { processPayment, loading, error };
}