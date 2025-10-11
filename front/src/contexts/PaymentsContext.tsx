import { createContext, useState, useCallback, ReactNode } from 'react';

export interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface PaymentsState {
  payments: Payment[];
  loading: boolean;
  error: string | null;
}

interface PaymentsContextType extends PaymentsState {
  refreshPayments: (userId: number) => Promise<void>;
}

export const PaymentsContext = createContext<PaymentsContextType | undefined>(undefined);

interface PaymentsProviderProps {
  children: ReactNode;
}

export function PaymentsProvider({ children }: PaymentsProviderProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
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

  // Payments methods
  const refreshPayments = useCallback(async (userId: number) => {
    await fetchData(`${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`, setPayments, setLoading, setError);
  }, [fetchData]);

  const value: PaymentsContextType = {
    payments,
    loading,
    error,
    refreshPayments,
  };

  return (
    <PaymentsContext.Provider value={value}>
      {children}
    </PaymentsContext.Provider>
  );
}