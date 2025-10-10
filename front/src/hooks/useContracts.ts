import { useContext } from 'react';
import { createApiHook } from './useApiHooksFactory';
import { AuthContext } from '../contexts/AuthContext';

const contractsHook = createApiHook('contracts', undefined, 'contracts');

export const useContracts = () => {
  const authContext = useContext(AuthContext);

  if (!authContext) {
    throw new Error('useContracts deve ser usado dentro de um AuthProvider');
  }

  if (!authContext.user) {
    return {
      contracts: [],
      contractsLoading: false,
      contractsError: null,
      refreshContracts: () => {},
      refetch: () => {}
    };
  }

  return contractsHook(authContext.user.id);
};