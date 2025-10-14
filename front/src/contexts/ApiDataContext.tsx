import { createContext, useState, useCallback, useRef, useMemo, useEffect, ReactNode } from 'react';

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
  createContract: (contractData: Record<string, unknown>) => Promise<Contract | null>;
  contractLoading: boolean;
  contractError: string | null;

  // Payments
  payments: Payment[];
  paymentsLoading: boolean;
  paymentsError: string | null;
  refreshPayments: (userId: number) => Promise<void>;
  processPayment: (paymentData: Record<string, unknown>, currentUserId?: number) => Promise<Payment | null>;
  paymentLoading: boolean;
  paymentError: string | null;

  // Balance
  balance: number;
  balanceLoading: boolean;
  balanceError: string | null;
  refreshBalance: (userId: number) => Promise<void>;

  // Cache management
  invalidateUserCache: (userId: number) => void;
  forceRefreshAllData: (userId: number) => Promise<void>;
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

  // Cache para evitar múltiplas requisições desnecessárias
  const requestCache = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());

  // Limpeza automática de cache antigo (chamada periodicamente)
  const cleanupCache = useCallback(() => {
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos
    const entriesToDelete: string[] = [];

    requestCache.current.forEach((value, key) => {
      if ((now - value.timestamp) >= CACHE_DURATION) {
        entriesToDelete.push(key);
      }
    });

    entriesToDelete.forEach(key => requestCache.current.delete(key));

    if (entriesToDelete.length > 0 && import.meta.env.DEV) {
      console.log(`🧹 [API_DATA] Cache limpo: ${entriesToDelete.length} entradas removidas`);
    }
  }, []);

  // Limpeza automática de cache a cada 10 minutos
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupCache, 10 * 60 * 1000); // 10 minutos

    return () => clearInterval(cleanupInterval);
  }, [cleanupCache]);

  // Função para invalidação manual de cache do usuário
  const invalidateUserCache = useCallback((userId: number) => {
    const userCacheKeys = [
      `${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`,
      `${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`,
      `${import.meta.env.VITE_API_URL}/users/${userId}/balance`,
    ];

    console.log(`🔄 [CACHE_INVALIDATE] Iniciando invalidação para usuário ${userId}`);
    console.log(`📋 [CACHE_INVALIDATE] Chaves que serão verificadas:`, userCacheKeys);

    let invalidatedCount = 0;
    userCacheKeys.forEach(key => {
      if (requestCache.current.has(key)) {
        requestCache.current.delete(key);
        invalidatedCount++;
        console.log(`✅ [CACHE_INVALIDATE] Removida: ${key}`);
      } else {
        console.log(`❌ [CACHE_INVALIDATE] Não encontrada: ${key}`);
      }
    });

    // Limpeza adicional - verificar chaves similares
    const allKeys = Array.from(requestCache.current.keys());
    const relatedKeys = allKeys.filter(key =>
      key.includes(`user_id=${userId}`) ||
      key.includes(`/users/${userId}`) ||
      key.includes(`/contracts`) ||
      key.includes(`/payments`)
    );

    relatedKeys.forEach(key => {
      requestCache.current.delete(key);
      invalidatedCount++;
      console.log(`🧹 [CACHE_INVALIDATE] Limpeza adicional: ${key}`);
    });

    console.log(`✅ [CACHE_INVALIDATE] Total de ${invalidatedCount} entradas removidas para usuário ${userId}`);

    // Forçar limpeza da memória
    if (typeof global !== 'undefined' && global.gc && invalidatedCount > 0) {
      global.gc();
      console.log(`🗑️ [CACHE_INVALIDATE] Garbage collection forçado`);
    }
  }, []);

  // Generic fetcher with caching
  const fetchData = useCallback(async <T,>(
    url: string,
    setData: (data: T) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void,
    transform?: (data: unknown) => T
  ) => {
    // Verificar cache (5 minutos de duração)
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

    const cached = requestCache.current.get(url);
    if (cached && (now - cached.timestamp) < CACHE_DURATION) {
      setData(cached.data as T);
      if (import.meta.env.DEV) {
        console.log(`📋 [API_DATA] Dados carregados do cache: ${url}`);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (import.meta.env.DEV) {
        console.log(`🔄 [API_DATA] Buscando dados: ${url}`);
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const data = await response.json();
      const transformedData = transform ? transform(data) : data;

      // Atualizar cache
      requestCache.current.set(url, { data: transformedData, timestamp: now });

      setData(transformedData);

      if (import.meta.env.DEV) {
        console.log(`✅ [API_DATA] Dados carregados com sucesso: ${url}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(message);

      // Log detalhado apenas em desenvolvimento
      if (import.meta.env.DEV) {
        console.error(`❌ [API_DATA] Erro em ${url}:`, {
          message,
          error: error,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  }, []); // Removido cleanupCache - não é usado dentro de fetchData

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
    await fetchData(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`, setBalance, setBalanceLoading, setBalanceError, (data: unknown) => {
      const balanceData = data as { total_balance: number };
      return balanceData.total_balance || 0;
    });
  }, [fetchData]);

  // Função de emergência para forçar refresh completo
  const forceRefreshAllData = useCallback(async (userId: number) => {
    console.log(`🚨 [FORCE_REFRESH] ========== FORÇANDO REFRESH DE EMERGÊNCIA ==========`);

    // Limpeza completa do cache
    invalidateUserCache(userId);

    // Aguardar limpeza
    await new Promise(resolve => setTimeout(resolve, 100));

    // Refresh forçado múltiplas vezes para garantir
    console.log(`🔄 [FORCE_REFRESH] Executando refresh forçado...`);
    try {
      await Promise.all([
        refreshContracts(userId),
        refreshPayments(userId),
        refreshBalance(userId)
      ]);

      // Segunda rodada para garantir
      await Promise.all([
        refreshContracts(userId),
        refreshPayments(userId),
        refreshBalance(userId)
      ]);

      console.log(`✅ [FORCE_REFRESH] Refresh de emergência concluído para usuário ${userId}`);
    } catch (error) {
      console.error(`❌ [FORCE_REFRESH] Erro durante refresh de emergência:`, error);
    }

    console.log(`🚨 [FORCE_REFRESH] ========== EMERGÊNCIA CONCLUÍDA ==========`);
  }, [invalidateUserCache, refreshContracts, refreshPayments, refreshBalance]);

  // Contract creation methods with cache invalidation
  const createContract = useCallback(async (contractData: Record<string, unknown>) => {
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

      // 🔥 Limpeza imediata do cache após criação bem-sucedida
      const userId = contractData.user_id as number;
      if (userId) {
        invalidateUserCache(userId);

        // Forçar refresh imediato dos dados críticos
        setTimeout(() => {
          refreshContracts(userId);
          refreshBalance(userId);
        }, 100);

        console.log(`🔄 [API_DATA] Cache invalidado e dados atualizados após criação de contrato para usuário ${userId}`);
      }

      return contract;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      setContractError(message);
      return null;
    } finally {
      setContractLoading(false);
    }
  }, []);

  // Payment processing methods with FORCED cache invalidation
  const processPayment = useCallback(async (paymentData: Record<string, unknown>, currentUserId?: number) => {
    setPaymentLoading(true);
    setPaymentError(null);

    console.log('🚨 [PAYMENT_FORCE] ========== FORCED CACHE INVALIDATION MODE ==========');
    console.log('💳 [PAYMENT_FORCE] Dados do pagamento:', paymentData);
    console.log('👤 [PAYMENT_FORCE] User ID fornecido:', currentUserId);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        throw new Error(`Erro ao processar pagamento: HTTP ${response.status}`);
      }

      const payment = await response.json();
      console.log('✅ [PAYMENT_FORCE] Pagamento processado com sucesso:', payment);

      // 🔥 FORCED INVALIDATION - MAIS AGRESSIVA E IMEDIATA
      const contractId = paymentData.contract_id as number;
      let userId = currentUserId;

      console.log('🔥 [PAYMENT_FORCE] ========== EXECUTANDO INVALIDAÇÃO FORÇADA ==========');

      if (!userId && contractId) {
        try {
          const contractResponse = await fetch(`${import.meta.env.VITE_API_URL}/contracts/${contractId}`);
          if (contractResponse.ok) {
            const contract = await contractResponse.json();
            userId = contract.user_id;
          }
        } catch (e) {
          console.error('Erro ao buscar contrato:', e);
        }
      }

      if (userId) {
        console.log(`⚡ [PAYMENT_FORCE] INVALIDAÇÃO FORÇADA PARA USER ${userId}`);

        // LIMPEZA IMEDIATA ANTES DE QUALQUER COISA
        invalidateUserCache(userId);

        // AGUARDAR LIMPEZA SER PROCESSADA
        await new Promise(resolve => setTimeout(resolve, 10));

        // REFRESH FORÇADO SEM setTimeout
        await Promise.all([
          refreshContracts(userId),
          refreshPayments(userId),
          refreshBalance(userId)
        ]);

        // LIMPEZA ADICIONAL APÓS REFRESH
        invalidateUserCache(userId);

        console.log(`✅ [PAYMENT_FORCE] CACHE FORÇADO INVALIDADO PARA USER ${userId}`);
      } else {
        console.error('❌ [PAYMENT_FORCE] USER ID NÃO ENCONTRADO');
      }

      console.log('🎉 [PAYMENT_FORCE] ========== PROCESSO CONCLUÍDO ==========');
      return payment;

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [PAYMENT_FORCE] ERRO:', message);
      setPaymentError(message);
      return null;
    } finally {
      setPaymentLoading(false);
      console.log('🏁 [PAYMENT_FORCE] ========== FINALIZADO ==========');
    }
  }, [invalidateUserCache, refreshContracts, refreshPayments, refreshBalance]);

  const value: ApiDataContextType = useMemo(() => ({
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

    // Cache management
    invalidateUserCache,
    forceRefreshAllData,
  }), [
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

    // Cache management
    invalidateUserCache,
    forceRefreshAllData,
  ]);

  return (
    <ApiDataContext.Provider value={value}>
      {children}
    </ApiDataContext.Provider>
  );
}

