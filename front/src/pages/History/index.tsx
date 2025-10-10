import { Link } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { usePayments } from '../../hooks/usePayments';
import { useUserBalance } from '../../hooks/useUserBalance';
import Header from '../../components/Header';
import { Breadcrumbs, Footer } from '../../components/ui';
import { HistoryTable } from '../../components/domain';
import { formatCurrency } from '../../utils/formatters';

interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  discount_applied?: number;
  prorated_old?: number;
  prorated_new?: number;
  applied_credits?: number;
}

interface Contract {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  plan: {
    id: number;
    description: string;
    numberOfClients: number;
    gigabytesStorage: number;
    price: number;
    active: boolean;
  };
}

const userId = 1; // Assume logged-in user


export const History = () => {
   console.log('📋 [HISTORY PAGE] Inicializando página de histórico')
   const { contracts, loading: loadingContracts } = useContracts(userId);
   const { payments, loading: loadingPayments } = usePayments(userId);
   const { balance } = useUserBalance(userId);

  console.log('📊 [HISTORY PAGE] Dados carregados:', {
    contracts: contracts.length,
    payments: payments.length,
    loadingContracts,
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
  const historyItems = sortedContracts.map((contract, index) => {
    const contractPayments = payments.filter(p => p.contract_id === contract.id);

    // Usar os dados reais de desconto dos pagamentos do contrato
    const calculateDiscountDetails = (contract: Contract, contractPayments: Payment[]) => {
      // Buscar o pagamento mais recente apenas deste contrato
      const latestPayment = contractPayments.length > 0 ? contractPayments[contractPayments.length - 1] : null;

      console.log(`🔍 [DISCOUNT CALC] Contract ${contract.id} - Contract Payments:`, contractPayments);
      console.log(`🔍 [DISCOUNT CALC] Contract ${contract.id} - Latest Payment:`, latestPayment);

      if (latestPayment && latestPayment.discount_applied && latestPayment.discount_applied > 0) {
        // Usar dados reais do pagamento deste contrato
        const prorrata = latestPayment.prorated_old || 0;
        const appliedCredits = latestPayment.applied_credits || 0;
        const totalDiscount = latestPayment.discount_applied || 0;

        console.log(`💰 [DISCOUNT CALC] Contract ${contract.id} - Usando dados reais: Prorrata: ${prorrata}, Applied Credits: ${appliedCredits}, Total Discount: ${totalDiscount}`);

        return {
          prorrata,
          balanceCredit: appliedCredits,
          totalDiscount
        };
      } else {
        // Para contratos sem pagamentos com desconto (como o inicial)
        console.log(`💰 [DISCOUNT CALC] Contract ${contract.id} - Sem descontos (contrato inicial)`);

        return {
          prorrata: 0,
          balanceCredit: 0,
          totalDiscount: 0
        };
      }
    };

    const discountDetails = calculateDiscountDetails(contract, contractPayments);

    return {
      contract,
      payments: contractPayments,
      discountDetails
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
            <span className="text-lg font-bold text-blue-900">{formatCurrency(balance)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Planos Contratados</h2>

          {(loadingContracts || loadingPayments) && <p>Carregando histórico...</p>}

          <HistoryTable
            historyItems={historyItems}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />

          {!loadingContracts && !loadingPayments && historyItems.length === 0 && (
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