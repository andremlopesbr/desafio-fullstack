import { useState, useEffect } from 'react';

export function useUserBalance(userId: number) {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      console.log('🔄 [useUserBalance] Fazendo requisição para:', `${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
      console.log('📡 [useUserBalance] Status da resposta:', response.status);
      if (!response.ok) throw new Error('Failed to fetch balance');

      const data = await response.json();
      console.log('✅ [useUserBalance] Dados recebidos:', data);
      setBalance(data.total_balance || 0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('❌ [useUserBalance] Erro ao buscar balance:', errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [userId]);

  return { balance, loading, error, refetch: fetchBalance };
}