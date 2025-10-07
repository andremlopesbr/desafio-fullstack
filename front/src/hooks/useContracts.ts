import { useState, useEffect } from 'react';

interface Contract {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  plan: {
    id: number;
    description: string;
    numberOfClients: number;
    gigabytesStorage: number;
    price: number;
    active: boolean;
  };
}

export function useContracts(userId: number) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContracts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch contracts');
      const data = await response.json();
      setContracts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchContracts();
    }
  }, [userId]);

  return { contracts, loading, error, refetch: fetchContracts };
}