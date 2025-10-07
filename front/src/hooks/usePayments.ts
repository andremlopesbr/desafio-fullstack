import { useState, useEffect } from 'react';

interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function usePayments(userId: number) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    console.log('🔄 [HOOK usePayments] Iniciando busca de pagamentos para userId:', userId)
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`
      console.log('🌐 [HOOK usePayments] Fazendo requisição para:', apiUrl)

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch payments');

      const data = await response.json();
      console.log('✅ [HOOK usePayments] Pagamentos recebidos:', data.length, 'registros')
      setPayments(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ [HOOK usePayments] Erro ao buscar pagamentos:', errorMsg)
      setError(errorMsg);
    } finally {
      setLoading(false);
      console.log('🏁 [HOOK usePayments] Busca finalizada')
    }
  };

  useEffect(() => {
    if (userId) {
      fetchPayments();
    }
  }, [userId]);

  return { payments, loading, error, refetch: fetchPayments };
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