import { Link } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { usePayments } from '../../hooks/usePayments';
import { useUserBalance } from '../../hooks/useUserBalance';
import Header from '../../components/Header';

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

  // Ordenar contratos por data de criação para identificar o primeiro contrato
  const sortedContracts = [...contracts].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

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

          <div className="space-y-6">
             {historyItems.map(({ contract, payments, discountDetails }) => (
              <div key={contract.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Descrição do plano */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Plano</h3>
                    <p className="text-gray-900">{contract.plan.description}</p>
                    <p className="text-sm text-gray-600">
                      {contract.plan.numberOfClients} vistorias, {contract.plan.gigabytesStorage} GB
                    </p>
                  </div>

                  {/* Valor */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Valor</h3>
                    <p className="text-lg font-medium text-green-600">
                      {formatCurrency(contract.plan.price)}
                    </p>
                    <p className="text-sm text-gray-500">por mês</p>
                  </div>

                  {/* Detalhes do Desconto */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Descontos:</h3>
                    <div className="space-y-1 text-sm">
                      <p className={discountDetails.balanceCredit > 0 ? 'text-green-600' : 'text-gray-500'}>
                        Créditos (saldo): {discountDetails.balanceCredit > 0 ? formatCurrency(discountDetails.balanceCredit) : '0'} (saldo em conta)
                      </p>
                      <p className={discountDetails.prorrata > 0 ? 'text-blue-600' : 'text-gray-500'}>
                        Desconto (pro-rata): {discountDetails.prorrata > 0 ? formatCurrency(discountDetails.prorrata) : '0'} (pro-rata)
                      </p>
                      <p className={`font-medium ${discountDetails.totalDiscount > 0 ? 'text-blue-700' : 'text-gray-500'}`}>
                        Valor final: {discountDetails.totalDiscount > 0 ? formatCurrency(discountDetails.totalDiscount) : '0'}
                      </p>
                    </div>
                  </div>

                  {/* Status e Data */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">Status</h3>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                      contract.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : contract.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {contract.status === 'active' ? 'Ativo' :
                       contract.status === 'cancelled' ? 'Cancelado' :
                       contract.status}
                    </span>
                    <p className="text-sm text-gray-600 mt-1">
                      Contratado em {contract.start_date ? formatDate(contract.start_date) : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Pagamentos relacionados */}
                {payments.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-medium text-gray-700 mb-2">Pagamentos</h4>
                    <div className="space-y-2">
                      {payments.map((payment) => (
                        <div key={payment.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                          <div>
                            <p className="font-medium text-gray-900">
                              {formatCurrency(payment.amount / 100)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {formatDate(payment.payment_date)}
                            </p>
                          </div>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                            payment.status === 'paid'
                              ? 'bg-green-100 text-green-800'
                              : payment.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {payment.status === 'paid' ? 'Pago' :
                             payment.status === 'pending' ? 'Pendente' :
                             payment.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

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