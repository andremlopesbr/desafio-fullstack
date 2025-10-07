import { useState, useEffect } from 'react';

interface CreditTransaction {
  id: number;
  user_id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export function useCreditTransactionHistory(userId: number) {
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    console.log('🔄 [HOOK useCreditTransactionHistory] Iniciando busca de transações de crédito para userId:', userId);
    setLoading(true);
    setError(null);
    try {
      const apiUrl = `${import.meta.env.VITE_API_URL}/users/${userId}/balance-history`;
      console.log('🌐 [HOOK useCreditTransactionHistory] Fazendo requisição para:', apiUrl);

      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch balance history');

      const data = await response.json();
      console.log('✅ [HOOK useCreditTransactionHistory] Transações recebidas:', data.length, 'registros');
      setTransactions(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [HOOK useCreditTransactionHistory] Erro ao buscar transações:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
      console.log('🏁 [HOOK useCreditTransactionHistory] Busca finalizada');
    }
  };

  useEffect(() => {
    if (userId) {
      fetchTransactions();
    }
  }, [userId]);

  return { transactions, loading, error, refetch: fetchTransactions };
}