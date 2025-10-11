// Domain-specific contexts
export { PlansContext, PlansProvider, type Plan } from './PlansContext';
export { ContractsContext, ContractsProvider, type Contract } from './ContractsContext';
export { PaymentsContext, PaymentsProvider, type Payment } from './PaymentsContext';
export { BalanceContext, BalanceProvider } from './BalanceContext';

// Combined provider
export { AppDataProvider } from './AppDataContext';

// Legacy context (deprecated - use specific contexts above)
export { ApiDataContext, ApiDataProvider } from './ApiDataContext';