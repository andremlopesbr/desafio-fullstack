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
  createContract: (contractData: any) => Promise<Contract | null>;
  contractLoading: boolean;
  contractError: string | null;

  // Payments
  payments: Payment[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  refreshPayments: (userId: number) => Promise<void>;
  processPayment: (paymentData: any) => Promise<Payment | null>;
  paymentLoading: boolean;
  paymentError: string | null;

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

  // Contract creation state
  const [contractLoading, setContractLoading] = useState(false);
  const [contractError, setContractError] = useState<string | null>(null);

  // Payment processing state
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
    await fetchData(`${import.meta.env.VITE_API_URL}/plans`, setPlans, setPlansLoading, setPlansError);
  }, [fetchData]);

  // Contracts methods
  const refreshContracts = useCallback(async (userId: number) => {
    await fetchData(`${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`, setContracts, setContractsLoading, setContractsError);
  }, [fetchData]);

  // Payments methods
  const refreshPayments = useCallback(async (userId: number) => {
    await fetchData(`${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`, setPayments, setPaymentsLoading, setPaymentsError);
  }, [fetchData]);

  // Balance methods
  const refreshBalance = useCallback(async (userId: number) => {
    await fetchData(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`, setBalance, setBalanceLoading, setBalanceError, (data: { total_balance: number }) => data.total_balance || 0);
  }, [fetchData]);

  // Contract creation methods
  const createContract = useCallback(async (contractData: any) => {
    setContractLoading(true);
    setContractError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contractData),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar contrato');
      }

      const contract = await response.json();
      return contract;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setContractError(message);
      return null;
    } finally {
      setContractLoading(false);
    }
  }, []);

  // Payment processing methods
  const processPayment = useCallback(async (paymentData: any) => {
    setPaymentLoading(true);
    setPaymentError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pagamento');
      }

      const payment = await response.json();
      return payment;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setPaymentError(message);
      return null;
    } finally {
      setPaymentLoading(false);
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
    createContract,
    contractLoading,
    contractError,

    // Payments
    payments,
    paymentsLoading,
    paymentsError,
    refreshPayments,
    processPayment,
    paymentLoading,
    paymentError,

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
