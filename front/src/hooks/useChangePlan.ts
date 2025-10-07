import { useState } from 'react';

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

interface ChangePlanResult {
  contract: Contract;
  credits_available: number;
  discount_applied: number;
  final_amount: number;
  remaining_credit: number;
}

export function useChangePlan() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePlan = async (contractId: number, newPlanId: number): Promise<ChangePlanResult | null> => {
    setLoading(true);
    setError(null);
    console.log('Iniciando troca de plano', { contractId, newPlanId });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts/${contractId}/change-plan`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ new_plan_id: newPlanId }),
      });
      if (!response.ok) throw new Error('Failed to change plan');
      const result = await response.json();
      console.log('Troca de plano bem-sucedida', result);
      return result;
    } catch (err) {
      console.error('Erro na troca de plano', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { changePlan, loading, error };
}