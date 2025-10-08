import { useState, useEffect, useCallback } from 'react';

export function useUserCredits(userId: number) {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCredits = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
      if (!response.ok) throw new Error('Failed to fetch balance');

      const data = await response.json();
      setCredits(data.total_balance || 0);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCredits();
  }, [userId, fetchCredits]);

  return { credits, loading, error, refetch: fetchCredits };
}