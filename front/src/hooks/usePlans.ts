import { useContext } from 'react';
import { createApiHook } from './useApiHooksFactory';
import { AuthContext } from '../contexts/AuthContext';

const plansHook = createApiHook(
  'plans',
  (data: any) => data.plans || data,
  'plans'
);

export const usePlans = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('usePlans deve ser usado dentro de um AuthProvider');
  }

  if (!authContext.user) {
    return {
      plans: [],
      plansLoading: false,
      plansError: null,
      refreshPlans: () => {},
      refetch: () => {}
    };
  }

  return plansHook(authContext.user.id);
};
