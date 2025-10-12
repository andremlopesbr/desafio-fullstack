import { useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApiData } from '../../hooks/useApiData';
import { useAuth } from '../../hooks/useAuth';
import Header from '../../components/Header';
import { Breadcrumbs, Footer } from '../../components/ui';
import { HistoryTable } from '../../components/domain';
import { formatCurrency } from '../../utils/formatters';
import { Payment } from '../../types';


export const History = () => {
  const { user } = useAuth();
  const userId = user?.id || 1; // Obter ID do usuário autenticado ou fallback
  const {
    contracts,
    contractsLoading,
    payments,
    paymentsLoading,
    balance,
    refreshContracts,
    refreshPayments,
    refreshBalance
  } = useApiData();

  // ✅ CORREÇÃO: Estabilizar função com useCallback para evitar múltiplas requisições
  const loadHistoryData = useCallback(async () => {
    try {
      await Promise.all([
        refreshContracts(userId),
        refreshPayments(userId),
        refreshBalance(userId)
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do histórico:', error);
    }
  }, [userId, refreshContracts, refreshPayments, refreshBalance]);

  // Carregar dados iniciais
  useEffect(() => {
    if (userId) {
      loadHistoryData();
    }
  }, [userId, loadHistoryData]); // ✅ Usa loadHistoryData ao invés das funções individuais

  const loading = contractsLoading || paymentsLoading;

  console.log('📊 [HISTORY PAGE] Dados carregados:', {
    userId,
    contracts: contracts.length,
    payments: payments.length,
    contractsLoading,
    paymentsLoading: loading
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Ordenar contratos: plano ativo primeiro, depois por data de criação descendente
  const sortedContracts = [...contracts].sort((a, b) => {
    // Priorizar plano ativo
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    // Para contratos não ativos ou ambos ativos, ordenar por data descendente
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Combinar contratos com seus pagamentos para mostrar o histórico
  // TODO Podemos usar a api de pagamentos para trazer todas as informações dessa area e evitar essa combinação?
  const historyItems = sortedContracts.map((contract) => {
    const contractPayments = payments.filter((p: Payment) => p.contract_id === contract.id);

    return {
      contract,
      payments: contractPayments,
    };
  });

  console.log('📈 [HISTORY PAGE] Itens de histórico processados:', historyItems.length)

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Header user={{ id: userId, name: user?.name || "Usuário da Silva" }} />
      <Breadcrumbs items={[{ name: 'Histórico', href: '/history' }]} />
      <main className="flex-grow bg-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
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
            Meu Histórico
          </h1>

          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-lg sm:text-xl font-semibold mb-4">Planos Contratados</h2>

            {loading && <p className="text-center py-8">Carregando histórico...</p>}

            <HistoryTable
              historyItems={historyItems}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
            />

            {!loading && historyItems.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                Nenhum plano contratado ainda.
              </p>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default History;