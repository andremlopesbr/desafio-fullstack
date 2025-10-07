import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar se há usuário salvo na inicialização
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
        console.log('🔐 Usuário carregado do localStorage:', userData.name);
      } catch (error) {
        console.error('Erro ao carregar usuário do localStorage:', error);
        localStorage.removeItem('user');
      }
    } else {
      console.log('🔓 Nenhum usuário encontrado no localStorage');
    }
  }, []);

  const login = (userData: User) => {
    console.log('🔐 LOGIN:', userData.name, 'fez login');
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ Status: AUTENTICADO');
  };

  const logout = () => {
    console.log('🔓 LOGOUT:', user?.name, 'fez logout');
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('user');
    console.log('❌ Status: NÃO AUTENTICADO');
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