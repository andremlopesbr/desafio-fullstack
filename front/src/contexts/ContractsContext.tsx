import { createContext, useState, useCallback, ReactNode } from 'react';
import { Plan } from './PlansContext';

export interface Contract {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  plan: Plan;
}

interface ContractsState {
  contracts: Contract[];
  loading: boolean;
  error: string | null;
}

interface ContractsContextType extends ContractsState {
  refreshContracts: (userId: number) => Promise<void>;
}

export const ContractsContext = createContext<ContractsContextType | undefined>(undefined);

interface ContractsProviderProps {
  children: ReactNode;
}

export function ContractsProvider({ children }: ContractsProviderProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generic fetcher
  const fetchData = useCallback(async <T,>(
    url: string,
    setData: (data: T) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void,
    transform?: (data: any) => T
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch from ${url}`);
      const data = await response.json();
      const transformedData = transform ? transform(data) : data;
      setData(transformedData);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setError(message);
      console.error(`Error fetching from ${url}:`, message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Contracts methods
  const refreshContracts = useCallback(async (userId: number) => {
    await fetchData(`${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`, setContracts, setLoading, setError);
  }, [fetchData]);

  const value: ContractsContextType = {
    contracts,
    loading,
    error,
    refreshContracts,
  };

  return (
    <ContractsContext.Provider value={value}>
      {children}
    </ContractsContext.Provider>
  );
}