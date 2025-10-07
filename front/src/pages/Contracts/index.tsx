import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useContracts } from '../../hooks/useContracts';
import { usePlans } from '../../hooks/usePlans';
import { useCreateContract } from '../../hooks/useCreateContract';
import { useChangePlan } from '../../hooks/useChangePlan';
import { usePayments } from '../../hooks/usePayments';
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

export const Contracts = () => {
  const { contracts, loading: loadingContracts, error: errorContracts, refetch } = useContracts(userId);
  const { plans } = usePlans();
  const { createContract, loading: loadingCreate } = useCreateContract();
  const { changePlan, loading: loadingChange } = useChangePlan();
  const { payments, loading: loadingPayments, error: errorPayments } = usePayments(userId);

  const [formData, setFormData] = useState({
    plan_id: '',
    start_date: '',
    end_date: '',
    status: 'active',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      user_id: userId,
      plan_id: parseInt(formData.plan_id),
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
      status: formData.status,
    };
    await createContract(data);
    refetch(); // Refresh list
    setFormData({ plan_id: '', start_date: '', end_date: '', status: 'active' });
  };

  const handleChangePlan = async (contractId: number, newPlanId: number) => {
    await changePlan(contractId, newPlanId);
    refetch();
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={{ id: 1, name: "Usuário Teste" }} />
      <div className="container mx-auto p-4">
        <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Voltar ao Início</Link>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          <strong>TODO: Visão Admin somente</strong> - Esta página é para visualização administrativa apenas.
        </div>
        <h1 className="text-2xl font-bold mb-6">Contratos</h1>

        {/* Create Contract Form */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Criar Novo Contrato</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Plano</label>
              <select
                value={formData.plan_id}
                onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                required
              >
                <option value="">Selecione um plano</option>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.description} - {formatCurrency(plan.price)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Data de Início</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Data de Fim</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="mt-1 block w-full border border-gray-300 rounded-md p-2"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={loadingCreate}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loadingCreate ? 'Criando...' : 'Criar Contrato'}
            </button>
          </form>
        </div>

        {/* Contracts History */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Histórico de Contratos e Pagamentos</h2>
          {(loadingContracts || loadingPayments) && <p>Carregando histórico...</p>}
          {errorContracts && <p className="text-red-500">Erro contratos: {errorContracts}</p>}
          {errorPayments && <p className="text-red-500">Erro pagamentos: {errorPayments}</p>}
          <ul className="space-y-4">
            {contracts.map((contract) => {
              // Encontrar pagamentos relacionados ao contrato
              const contractPayments = payments.filter(p => p.contract_id === contract.id);

              // Calcular desconto/crédito (simplificado: se o pagamento for menor que o preço do plano, há desconto)
              const calculateDiscount = (contract: Contract, contractPayments: Payment[]) => {
                // Lógica básica: se o primeiro pagamento for diferente do preço do plano, há desconto
                if (contractPayments.length > 0) {
                  const firstPayment = contractPayments[0];
                  const planPrice = contract.plan.price;
                  const paymentAmount = firstPayment.amount;
                  const discount = planPrice - paymentAmount;
                  return discount > 0 ? discount : 0;
                }
                return 0;
              };

              const discount = calculateDiscount(contract, contractPayments);

              return (
                <li key={contract.id} className="border border-gray-200 p-4 rounded-md">
                  <div className="mb-4">
                    <p><strong>Contrato ID:</strong> {contract.id}</p>
                    <p><strong>Plano:</strong> {contract.plan.description}</p>
                    <p><strong>Status:</strong> {contract.status}</p>
                    <p><strong>Valor do Plano:</strong> {formatCurrency(contract.plan.price)}</p>
                    <p><strong>Desconto/Crédito Aplicado:</strong> {formatCurrency(discount)}</p>
                  </div>

                  {/* Lista de pagamentos do contrato */}
                  <div className="mt-4">
                    <h3 className="font-medium mb-2">Pagamentos:</h3>
                    {contractPayments.length > 0 ? (
                      <ul className="space-y-2">
                        {contractPayments.map((payment) => (
                          <li key={payment.id} className="bg-gray-50 p-3 rounded">
                            <p><strong>Valor Pago:</strong> {formatCurrency(payment.amount)}</p>
                            <p><strong>Data de Pagamento:</strong> {new Date(payment.payment_date).toLocaleDateString('pt-BR')}</p>
                            <p><strong>Status:</strong> {payment.status}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">Nenhum pagamento registrado para este contrato.</p>
                    )}
                  </div>

                  {/* Opção de alterar plano apenas para contratos ativos */}
                  {contract.status === 'active' && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium">Alterar Plano</label>
                      <select
                        onChange={(e) => handleChangePlan(contract.id, parseInt(e.target.value))}
                        defaultValue=""
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        disabled={loadingChange}
                      >
                        <option value="" disabled>Selecione novo plano</option>
                        {plans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.description} - {formatCurrency(plan.price)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {!loadingContracts && !loadingPayments && contracts.length === 0 && (
            <p>Nenhum contrato encontrado.</p>
          )}
        </div>
      </div>
    </div>
  );
};