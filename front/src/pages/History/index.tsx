import { Link } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { usePayments } from '../../hooks/usePayments';
import { useUserBalance } from '../../hooks/useUserBalance';
import Header from '../../components/Header';
import { HistoryTable } from '../../components/domain';

interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

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

    // Verificar se é o primeiro contrato (contrato inicial)
    const isFirstContract = index === 0;

    // Calcular detalhes do desconto baseado nos pagamentos e créditos aplicados
    const calculateDiscountDetails = (contract: Contract, payments: Payment[], isFirstContract: boolean) => {
      const planPrice = contract.plan.price;
      const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount / 100), 0);

      console.log(`🔍 [DISCOUNT CALC] Contract ${contract.id} - Plan Price: ${planPrice}, Total Paid: ${totalPaid}, Is First: ${isFirstContract}`);

      // Prorrata: diferença entre preço do plano e valor pago (representa período proporcional)
      const prorrata = isFirstContract ? 0 : Math.max(planPrice - totalPaid, 0);

      // Balance Credit: por enquanto assumimos que é baseado no balance disponível
      // Em um cenário real, isso seria calculado baseado em créditos específicos aplicados
      const balanceCredit = balance > 0 ? Math.min(balance, prorrata) : 0;

      // Total discount: soma do prorrata e créditos aplicados
      const totalDiscount = prorrata + balanceCredit;

      console.log(`💰 [DISCOUNT CALC] Contract ${contract.id} - Prorrata: ${prorrata}, Balance Credit: ${balanceCredit}, Total Discount: ${totalDiscount}`);

      return {
        prorrata,
        balanceCredit,
        totalDiscount
      };
    };

    const discountDetails = calculateDiscountDetails(contract, contractPayments, isFirstContract);

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
      <div className="container mx-auto px-4 py-8">
        <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Voltar aos Planos</Link>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Meu Histórico</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-800">Saldo: </span>
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
    </div>
  );
};

export default History;