export interface Plano {
  id: number;
  description: string;
  numberOfClients: number;
  gigabytesStorage: number;
  price: number;
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
  amount: number;
  status: string;
  payment_date: string;
  created_at: string;
  updated_at: string;
}

// Interfaces para Dependency Inversion
export interface PlansService {
  fetchPlans: () => Promise<Plano[]>;
}

export interface ContractsService {
  fetchContracts: (userId: number) => Promise<Contract[]>;
}