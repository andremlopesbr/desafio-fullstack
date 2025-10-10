import { Link } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { usePayments } from '../../hooks/usePayments';
import { useUserBalance } from '../../hooks/useUserBalance';
import Header from '../../components/Header';
import { Breadcrumbs, Footer } from '../../components/ui';
import { HistoryTable } from '../../components/domain';
import { formatCurrency } from '../../utils/formatters';
import { Payment } from '../../types';

// TODO adicionar usuário persistido no AuthContext/Storage quando faz login
const userId = 1; 


export const History = () => {
   const { contracts, contractsLoading } = useContracts();
   const { payments, loading: loadingPayments } = usePayments(userId);
   const { balance } = useUserBalance();

  console.log('📊 [HISTORY PAGE] Dados carregados:', {
    userId,
    contracts: contracts.length,
    payments: payments.length,
    contractsLoading,
    loadingPayments
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
    <div className="min-h-screen bg-gray-100">
      <Header user={{ id: userId, name: "Usuário da Silva" }} />
      <Breadcrumbs items={[{ name: 'Histórico', href: '/history' }]} />
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Voltar aos Planos</Link>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Meu Histórico</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-800">Saldo: </span>
            {/* Carregar saldo do Balance */}
            <span className="text-lg font-bold text-blue-900">{formatCurrency(typeof balance === 'number' ? balance : 0)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Planos Contratados</h2>

          {(contractsLoading || loadingPayments) && <p>Carregando histórico...</p>}

          <HistoryTable
            historyItems={historyItems}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />

          {!contractsLoading && !loadingPayments && historyItems.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              Nenhum plano contratado ainda.
            </p>
          )}
        </div>

      </div>
      <Footer />
    </div>
  );
};

export default History;