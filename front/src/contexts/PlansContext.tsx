import { createContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface Plan {
  id: number;
  description: string;
  numberOfClients: number;
  gigabytesStorage: number;
  price: number;
  active: boolean;
}

interface PlansState {
  plans: Plan[];
  loading: boolean;
  error: string | null;
}

interface PlansContextType extends PlansState {
  refreshPlans: () => Promise<void>;
}

export const PlansContext = createContext<PlansContextType | undefined>(undefined);

interface PlansProviderProps {
  children: ReactNode;
}

export function PlansProvider({ children }: PlansProviderProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

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

  // Plans methods
  const refreshPlans = useCallback(async () => {
    await fetchData(`${import.meta.env.VITE_API_URL}/plans`, setPlans, setLoading, setError);
  }, [fetchData]);

  // Auto-initialize plans data
  useEffect(() => {
    if (!initialized) {
      setInitialized(true);
      refreshPlans();
    }
  }, [initialized, refreshPlans]);

  const value: PlansContextType = {
    plans,
    loading,
    error,
    refreshPlans,
  };

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  );
}