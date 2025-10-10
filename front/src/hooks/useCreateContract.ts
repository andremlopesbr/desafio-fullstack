import { useApiMutation } from './useApiMutation';

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

/**
 * Hook para criação de contratos
 * Usa o padrão de mutação padronizado seguindo SRP
 */
export function useCreateContract() {
  const { data, loading, error, execute } = useApiMutation<Contract>();

  const createContract = async (data: ContractCreate): Promise<Contract | null> => {
    return execute<ContractCreate>('/contracts', { method: 'POST' }, data);
  };

  return { createContract, data, loading, error };
}