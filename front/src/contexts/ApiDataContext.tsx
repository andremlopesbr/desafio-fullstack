import { createContext, useState, useCallback, useRef, useMemo, useEffect, ReactNode } from 'react'
import { extractArrayFromData, extractBalanceFromData } from '../utils/apiUtils'

interface Plano {
  id: number
  description: string
  numberOfClients: number
  gigabytesStorage: number
  price: number
  active: boolean
}

interface Contract {
  id: number
  user_id: number
  plan_id: number
  start_date: string | null
  end_date: string | null
  status: string | null
  created_at: string
  updated_at: string
  plan: Plano
}

interface Payment {
  id: number
  contract_id: number
  amount: number
  payment_date: string
  status: string
  created_at: string
  updated_at: string
}

interface ApiDataContextType {
  plans: Plano[]
  plansLoading: boolean
  plansError: string | null
  refreshPlans: () => Promise<void>
  contracts: Contract[]
  contractsLoading: boolean
  contractsError: string | null
  refreshContracts: (userId: number) => Promise<void>
  createContract: (contractData: Record<string, unknown>) => Promise<Contract | null>
  contractLoading: boolean
  contractError: string | null
  payments: Payment[]
  paymentsLoading: boolean
  paymentsError: string | null
  refreshPayments: (userId: number) => Promise<void>
  processPayment: (
    paymentData: Record<string, unknown>,
    currentUserId?: number
  ) => Promise<Payment | null>
  paymentLoading: boolean
  paymentError: string | null
  balance: number
  balanceLoading: boolean
  balanceError: string | null
  refreshBalance: (userId: number) => Promise<void>
  invalidateUserCache: (userId: number) => void
  forceRefreshAllData: (userId: number) => Promise<void>
}

export const ApiDataContext = createContext<ApiDataContextType | undefined>(undefined)

interface ApiDataProviderProps {
  children: ReactNode
}

export function ApiDataProvider({ children }: ApiDataProviderProps) {
  const [plans, setPlans] = useState<Plano[]>([])
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError] = useState<string | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractsLoading, setContractsLoading] = useState(false)
  const [contractsError, setContractsError] = useState<string | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [balance, setBalance] = useState(0)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  const [contractLoading, setContractLoading] = useState(false)
  const [contractError, setContractError] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const requestCache = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map())
  const cleanupCache = useCallback(() => {
    const now = Date.now()
    const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos
    const entriesToDelete: string[] = []

    requestCache.current.forEach((value, key) => {
      if (now - value.timestamp >= CACHE_DURATION) {
        entriesToDelete.push(key)
      }
    })

    entriesToDelete.forEach(key => requestCache.current.delete(key))
  }, [])
  useEffect(() => {
    const cleanupInterval = setInterval(cleanupCache, 10 * 60 * 1000) // 10 minutos

    return () => clearInterval(cleanupInterval)
  }, [cleanupCache])
  const invalidateUserCache = useCallback((userId: number) => {
    const userCacheKeys = [
      `${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`,
      `${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`,
      `${import.meta.env.VITE_API_URL}/users/${userId}/balance`
    ]

    let invalidatedCount = 0
    userCacheKeys.forEach(key => {
      if (requestCache.current.has(key)) {
        requestCache.current.delete(key)
        invalidatedCount++
      }
    })
    const allKeys = Array.from(requestCache.current.keys())
    const relatedKeys = allKeys.filter(
      key =>
        key.includes(`user_id=${userId}`) ||
        key.includes(`/users/${userId}`) ||
        key.includes(`/contracts`) ||
        key.includes(`/payments`)
    )

    relatedKeys.forEach(key => {
      requestCache.current.delete(key)
      invalidatedCount++
    })
    if (typeof global !== 'undefined' && global.gc && invalidatedCount > 0) {
      global.gc()
    }
  }, [])
  const fetchData = useCallback(
    async <T,>(
      url: string,
      setData: (data: T) => void,
      setLoading: (loading: boolean) => void,
      setError: (error: string | null) => void,
      transform?: (data: unknown) => T
    ) => {
      const now = Date.now()
      const CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

      const cached = requestCache.current.get(url)
      if (cached && now - cached.timestamp < CACHE_DURATION) {
        setData(cached.data as T)
        return
      }

      setLoading(true)
      setError(null)
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`)
        const data = await response.json()
        const transformedData = transform ? transform(data) : data
        requestCache.current.set(url, { data: transformedData, timestamp: now })

        setData(transformedData)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        setError(message)
        if (import.meta.env.DEV) {
          console.error(`❌ [API_DATA] Erro em ${url}:`, {
            message,
            error: error,
            timestamp: new Date().toISOString()
          })
        }
      } finally {
        setLoading(false)
      }
    },
    []
  ) // Removido cleanupCache - não é usado dentro de fetchData
  const refreshPlans = useCallback(async () => {
    await fetchData(
      `${import.meta.env.VITE_API_URL}/plans`,
      setPlans,
      setPlansLoading,
      setPlansError,
      extractArrayFromData<Plano>()
    )
  }, [fetchData])
  const refreshContracts = useCallback(
    async (userId: number) => {
      await fetchData(
        `${import.meta.env.VITE_API_URL}/contracts?user_id=${userId}`,
        setContracts,
        setContractsLoading,
        setContractsError,
        extractArrayFromData<Contract>()
      )
    },
    [fetchData]
  )
  const refreshPayments = useCallback(
    async (userId: number) => {
      await fetchData(
        `${import.meta.env.VITE_API_URL}/payments?user_id=${userId}`,
        setPayments,
        setPaymentsLoading,
        setPaymentsError,
        extractArrayFromData<Payment>()
      )
    },
    [fetchData]
  )
  const refreshBalance = useCallback(
    async (userId: number) => {
      await fetchData(
        `${import.meta.env.VITE_API_URL}/users/${userId}/balance`,
        setBalance,
        setBalanceLoading,
        setBalanceError,
        extractBalanceFromData()
      )
    },
    [fetchData]
  )
  const forceRefreshAllData = useCallback(
    async (userId: number) => {
      invalidateUserCache(userId)
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        await Promise.all([
          refreshContracts(userId),
          refreshPayments(userId),
          refreshBalance(userId)
        ])
        await Promise.all([
          refreshContracts(userId),
          refreshPayments(userId),
          refreshBalance(userId)
        ])
      } catch (error) {
        console.error(`❌ [FORCE_REFRESH] Erro durante refresh de emergência:`, error)
      }
    },
    [invalidateUserCache, refreshContracts, refreshPayments, refreshBalance]
  )
  const createContract = useCallback(
    async (contractData: Record<string, unknown>) => {
      setContractLoading(true)
      setContractError(null)
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/contracts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(contractData)
        })

        if (!response.ok) {
          throw new Error('Erro ao criar contrato')
        }

        const contract = await response.json()
        const userId = contractData.user_id as number
        if (userId) {
          invalidateUserCache(userId)
          setTimeout(() => {
            refreshContracts(userId)
            refreshBalance(userId)
          }, 100)
        }

        return contract
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        setContractError(message)
        return null
      } finally {
        setContractLoading(false)
      }
    },
    [invalidateUserCache, refreshBalance, refreshContracts]
  )
  const processPayment = useCallback(
    async (paymentData: Record<string, unknown>, currentUserId?: number) => {
      setPaymentLoading(true)
      setPaymentError(null)

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(paymentData)
        })

        if (!response.ok) {
          throw new Error(`Erro ao processar pagamento: HTTP ${response.status}`)
        }

        const payment = await response.json()
        const contractId = paymentData.contract_id as number
        let userId = currentUserId

        if (!userId && contractId) {
          try {
            const contractResponse = await fetch(
              `${import.meta.env.VITE_API_URL}/contracts/${contractId}`
            )
            if (contractResponse.ok) {
              const contract = await contractResponse.json()
              userId = contract.user_id
            }
          } catch (e) {
            console.error('Erro ao buscar contrato:', e)
          }
        }

        if (userId) {
          invalidateUserCache(userId)
          await new Promise(resolve => setTimeout(resolve, 10))
          await Promise.all([
            refreshContracts(userId),
            refreshPayments(userId),
            refreshBalance(userId)
          ])
          invalidateUserCache(userId)
        } else {
          console.error('❌ [PAYMENT_FORCE] USER ID NÃO ENCONTRADO')
        }

        return payment
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro desconhecido'
        console.error('❌ [PAYMENT_FORCE] ERRO:', message)
        setPaymentError(message)
        return null
      } finally {
        setPaymentLoading(false)
      }
    },
    [invalidateUserCache, refreshContracts, refreshPayments, refreshBalance]
  )

  const value: ApiDataContextType = useMemo(
    () => ({
      plans,
      plansLoading,
      plansError,
      refreshPlans,
      contracts,
      contractsLoading,
      contractsError,
      refreshContracts,
      createContract,
      contractLoading,
      contractError,
      payments,
      paymentsLoading,
      paymentsError,
      refreshPayments,
      processPayment,
      paymentLoading,
      paymentError,
      balance,
      balanceLoading,
      balanceError,
      refreshBalance,
      invalidateUserCache,
      forceRefreshAllData
    }),
    [
      plans,
      plansLoading,
      plansError,
      refreshPlans,
      contracts,
      contractsLoading,
      contractsError,
      refreshContracts,
      createContract,
      contractLoading,
      contractError,
      payments,
      paymentsLoading,
      paymentsError,
      refreshPayments,
      processPayment,
      paymentLoading,
      paymentError,
      balance,
      balanceLoading,
      balanceError,
      refreshBalance,
      invalidateUserCache,
      forceRefreshAllData
    ]
  )

  return <ApiDataContext.Provider value={value}>{children}</ApiDataContext.Provider>
}
