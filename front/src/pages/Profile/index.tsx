import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/Header';
import { Breadcrumbs, Footer } from '../../components/ui';
import { useContracts } from '../../hooks/useContracts';
import { formatCurrency } from '../../utils/formatters';

const Profile = () => {
  console.log('👤 [PROFILE PAGE] Inicializando página de perfil')
  const [user, setUser] = useState<{ id: number; name: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { contracts, loading: contractsLoading } = useContracts(1);
  console.log('📊 [PROFILE PAGE] Carregando contratos e usuário:', { contractsLoading })

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/user`);
        if (!response.ok) throw new Error('Failed to fetch user');
        const userData = await response.json();
        setUser(userData);
        console.log('✅ [PROFILE PAGE] Usuário carregado:', userData);
      } catch (error) {
        console.error('❌ [PROFILE PAGE] Erro ao buscar usuário:', error);
      } finally {
        setLoading(false);
        console.log('🏁 [PROFILE PAGE] Loading finalizado');
      }
    };

    fetchUser();
  }, []);

  if (loading || contractsLoading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header user={{ id: 1, name: "Carregando..." }} />
        <div className="flex justify-center items-center h-screen">
          <div className="text-lg">Carregando perfil...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Header user={{ id: 1, name: "Erro" }} />
        <div className="flex justify-center items-center h-screen">
          <div className="text-red-500 text-lg">Erro ao carregar perfil</div>
        </div>
      </div>
    );
  }

  // Encontrar contrato ativo
  const activeContract = contracts.find(contract => contract.status === 'active');
  console.log('🎯 [PROFILE PAGE] Contrato ativo encontrado:', activeContract ? { id: activeContract.id, planId: activeContract.plan_id, status: activeContract.status, plan: activeContract.plan } : 'NENHUM')


  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={{ id: user.id, name: user.name }} />
      <Breadcrumbs items={[{ name: 'Perfil', href: '/profile' }]} />
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Voltar aos Planos</Link>

        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Meu Perfil</h1>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Nome</label>
              <p className="mt-1 text-lg text-gray-900">{user.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-lg text-gray-900">{user.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">ID do Usuário</label>
              <p className="mt-1 text-lg text-gray-900">{user.id}</p>
            </div>

            <hr className="my-6" />

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

          <div className="mt-8 text-center">
            <Link
              to="/"
              className="bg-orange-500 text-white px-6 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              Ver Planos Disponíveis
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;