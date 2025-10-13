import { createContext, useState, useEffect, ReactNode } from 'react';
import { useErrorHandler } from '../hooks/useErrorHandler';

interface User {
  id: number;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { setError, clearError } = useErrorHandler();

  useEffect(() => {
    console.log('🔐 [AUTH] Verificando sessão do usuário no localStorage');
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log('✅ [AUTH] Usuário encontrado no localStorage:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        clearError();
        console.log('✅ [AUTH] Sessão do usuário restaurada com sucesso');
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Erro ao fazer parse do usuário');
        console.error('❌ [AUTH] Erro ao carregar usuário do localStorage:', error);
        setError(errorObj, 'Carregamento de sessão do usuário');
        localStorage.removeItem('user');
        console.log('🗑️ [AUTH] Dados corrompidos removidos do localStorage');
      }
    } else {
      console.log('ℹ️ [AUTH] Nenhum usuário encontrado no localStorage');
    }
  }, [setError, clearError]);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    isAuthenticated,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}