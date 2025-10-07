import { useState } from 'react';

interface ContractCreate {
  user_id: number;
  plan_id: number;
  start_date?: string;
  end_date?: string;
  status?: string;
}

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

export function useCreateContract() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createContract = async (data: ContractCreate): Promise<Contract | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create contract');
      const contract = await response.json();
      return contract;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { createContract, loading, error };
}