import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useApiData } from '../../hooks/useApiData';
import { useUserBalance } from '../../hooks/useUserBalance';
import { Breadcrumbs } from '../../components/ui';
import Layout from '../../components/Layout';
import { formatCurrency } from '../../utils/formatters';
import { Contract } from '../../types';

/**
 * Página de Perfil do Usuário
 *
 * Exibe informações pessoais, plano atual e saldo disponível.
 * Implementa loading simplificado e tratamento de erros robusto.
 */
const Profile = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { contracts, contractsLoading, refreshContracts } = useApiData();
  const { balance } = useUserBalance(authUser?.id);

  // Estado composto para verificar se dados estão prontos
  const isDataReady = useMemo(() => {
    if (contractsLoading) return false;
    if (isLoading) return false;
    return true;
  }, [contractsLoading, isLoading]);

  // Carregar dados do usuário e contratos
  useEffect(() => {
    console.log('🔄 [PROFILE] Iniciando carregamento de dados do perfil');
    console.log('👤 [PROFILE] Usuário autenticado:', authUser);

    const loadProfileData = async () => {
      setIsLoading(true);
      try {
        // Usar dados do auth se disponível, caso contrário buscar da API
        if (authUser) {
          console.log('✅ [PROFILE] Usando dados do usuário autenticado');
          setUser(authUser);
        } else {
          console.log('🔍 [PROFILE] Buscando dados do usuário da API');
          const response = await fetch(`${import.meta.env.VITE_API_URL}/user`);
          if (response.ok) {
            const userData = await response.json();
            console.log('✅ [PROFILE] Dados do usuário obtidos da API:', userData);
            setUser(userData);
          } else {
            console.error('❌ [PROFILE] Erro ao buscar usuário:', response.status);
          }
        }

        // Carregar contratos se usuário estiver disponível
        if (authUser?.id) {
          console.log('📋 [PROFILE] Carregando contratos para usuário:', authUser.id);
          await refreshContracts(authUser.id);
        } else {
          console.warn('⚠️ [PROFILE] Nenhum ID de usuário disponível para carregar contratos');
        }
      } catch (error) {
        console.error('❌ [PROFILE] Erro ao carregar dados do perfil:', error);
      } finally {
        console.log('✅ [PROFILE] Carregamento de dados concluído');
        setIsLoading(false);
      }
    };

    loadProfileData();
  }, [authUser, refreshContracts]);

  // Loading state
  if (!isDataReady) {
    return (
      <Layout user={{ id: authUser?.id || 1, name: authUser?.name || "Carregando..." }}>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="text-center">
            <div className="text-lg mb-2">Carregando perfil...</div>
            <div className="text-sm text-gray-500">
              {contractsLoading ? "Carregando contratos..." : "Carregando dados do usuário..."}
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (!user) {
    return (
      <Layout user={{ id: authUser?.id || 1, name: authUser?.name || "Erro" }}>
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <div className="text-red-500 text-lg">Erro ao carregar perfil do usuário</div>
        </div>
      </Layout>
    );
  }

  // Encontrar contrato ativo
  const activeContract = contracts.find((contract: Contract) => contract.status === 'active');


  return (
    <Layout user={{ id: user.id, name: user.name }}>
      <Breadcrumbs items={[{ name: 'Perfil', href: '/profile' }]} />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <Link to="/" className="text-blue-500 hover:underline mb-2 sm:mb-0">&larr; Voltar aos Planos</Link>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 sm:px-4 py-2">
            <span className="text-sm font-medium text-blue-800">Saldo: </span>
            <span className="text-base sm:text-lg font-bold text-blue-900">
              {formatCurrency(typeof balance === 'number' ? balance : 0)}
            </span>
          </div>
        </div>

        <h1 className="text-orange-400 text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Meu Perfil
        </h1>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Informações Pessoais</h2>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Nome:</span>
                    <p className="text-gray-900">{user.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <p className="text-gray-900">{user.email}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">ID:</span>
                    <p className="text-gray-900">{user.id}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Plano Atual</h2>
              {activeContract && activeContract.plan ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-800 font-medium">Plano Ativo</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-900 font-medium">{activeContract.plan.description}</p>
                    <p className="text-gray-700">Preço: {formatCurrency(activeContract.plan.price)}/mês</p>
                    <p className="text-gray-700">Vistorias: {activeContract.plan.numberOfClients}</p>
                    <p className="text-gray-700">Armazenamento: {activeContract.plan.gigabytesStorage} GB</p>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <div className="w-3 h-3 bg-gray-400 rounded-full mr-2"></div>
                    <span className="text-gray-600 font-medium">Nenhum Plano Ativo</span>
                  </div>
                  <p className="text-gray-500 text-sm">Você ainda não possui um plano contratado.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 sm:mt-8 text-center">
            <Link
              to="/"
              className="bg-orange-500 text-white px-4 sm:px-6 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              Ver Planos Disponíveis
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;