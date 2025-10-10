import { createApiHook } from './useApiHooksFactory';

interface UserBalanceResponse {
 total_balance: number;
}

/**
* Hook para obter créditos do usuário
* Usa padrão Factory seguindo princípio DRY e OCP
*/
export const useUserCredits = createApiHook<UserBalanceResponse>(
 `users/${window.location.pathname.split('/')[2]}/balance`,
 (data: any) => ({ total_balance: data.total_balance || data.balance || 0 }),
 'credits'
);