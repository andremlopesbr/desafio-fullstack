export interface Plano {
  id: number;
  name?: string;
  description: string;
  numberOfClients: number;
  gigabytesStorage: number;
  price: number; // em reais (float)
  credits?: number;
  active: boolean;
}

export interface User {
  id: number;
  name: string;
  activeContract?: {
    planId: number;
    planName: string;
  };
}

export interface Contract {
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

export interface Payment {
  id: number;
  contract_id: number;
  amount: number; // em reais (float)
  status: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

export interface BalanceTransaction {
  id: number;
  user_id: number;
  amount: number; // em reais (float)
  description: string;
  created_at: string;
  updated_at: string;
}

export interface UserBalance {
  total_balance: number; // em reais (float)
}

export interface ChangePlanResponse {
  contract: Contract;
  remaining_credit?: number;
  credit_message?: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

// Interfaces para Dependency Inversion
export interface PlansService {
  fetchPlans: () => Promise<Plano[]>;
}

export interface ContractsService {
  fetchContracts: (userId: number) => Promise<Contract[]>;
  createContract: (userId: number, planId: number, startDate?: string, endDate?: string) => Promise<Contract>;
  changePlan: (contractId: number, newPlanId: number) => Promise<ChangePlanResponse>;
}

export interface PaymentsService {
  fetchPayments: (userId: number) => Promise<Payment[]>;
  processPayment: (contractId: number, amount: number, paymentDate: string, status?: string) => Promise<Payment>;
}

export interface UserService {
  getCurrentUser: () => Promise<User>;
  getBalanceHistory: (userId: number) => Promise<BalanceTransaction[]>;
  getBalance: (userId: number) => Promise<UserBalance>;
  addBalance: (userId: number, amount: number, description: string) => Promise<{ message: string }>;
}