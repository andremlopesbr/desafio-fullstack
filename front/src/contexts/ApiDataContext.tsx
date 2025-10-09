import { createContext, useState, useCallback, ReactNode } from 'react';

interface Plano {
  id: number;
  description: string;
  numberOfClients: number;
  gigabytesStorage: number;
  price: number;
  active: boolean;
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
  plan: Plano;
}

interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ApiDataContextType {
  // Plans
  plans: Plano[];
  plansLoading: boolean;
  plansError: string | null;
  refreshPlans: () => Promise<void>;

  // Contracts
  contracts: Contract[];
  contractsLoading: boolean;
  contractsError: string | null;
  refreshContracts: (userId: number) => Promise<void>;

  // Payments
  payments: Payment[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  refreshPayments: (userId: number) => Promise<void>;

  // Balance
  balance: number;
  balanceLoading: boolean;
  balanceError: string | null;
  refreshBalance: (userId: number) => Promise<void>;
}

export const ApiDataContext = createContext<ApiDataContextType | undefined>(undefined);


interface ApiDataProviderProps {
  children: ReactNode;
}

export function ApiDataProvider({ children }: ApiDataProviderProps) {
  // Plans state
  const [plans, setPlans] = useState<Plano[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansError, setPlansError] = useState<string | null>(null);

  // Contracts state
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [contractsError, setContractsError] = useState<string | null>(null);

  // Payments state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  // Balance state
  const [balance, setBalance] = useState(0);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Plans methods
  const refreshPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/plans`);
      if (!response.ok) throw new Error('Failed to fetch plans');
      const data = await response.json();
      setPlans(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPlansError(message);
      console.error('Error fetching plans:', message);
    } finally {
      setPlansLoading(false);
    }
  }, []);

  // Contracts methods
  const refreshContracts = useCallback(async (userId: number) => {
    setContractsLoading(true);
    setContractsError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch contracts');
      const data = await response.json();
      setContracts(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setContractsError(message);
      console.error('Error fetching contracts:', message);
    } finally {
      setContractsLoading(false);
    }
  }, []);

  // Payments methods
  const refreshPayments = useCallback(async (userId: number) => {
    setPaymentsLoading(true);
    setPaymentsError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch payments');
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setPaymentsError(message);
      console.error('Error fetching payments:', message);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  // Balance methods
  const refreshBalance = useCallback(async (userId: number) => {
    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`);
      if (!response.ok) throw new Error('Failed to fetch balance');
      const data = await response.json();
      const balanceValue = data.total_balance || 0;
      setBalance(balanceValue);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setBalanceError(message);
      console.error('Error fetching balance:', message);
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  const value: ApiDataContextType = {
    // Plans
    plans,
    plansLoading,
    plansError,
    refreshPlans,

    // Contracts
    contracts,
    contractsLoading,
    contractsError,
    refreshContracts,

    // Payments
    payments,
    paymentsLoading,
    paymentsError,
    refreshPayments,

    // Balance
    balance,
    balanceLoading,
    balanceError,
    refreshBalance,
  };

  return (
    <ApiDataContext.Provider value={value}>
      {children}
    </ApiDataContext.Provider>
  );
}
