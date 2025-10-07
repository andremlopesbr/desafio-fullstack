import { Link } from 'react-router-dom';
import { usePayments } from '../../hooks/usePayments';
import Header from '../../components/Header';

const userId = 1; // Assume logged-in user

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export const Payments = () => {
  console.log('📋 [PAYMENTS PAGE] Inicializando página de histórico de pagamentos')
  const { payments, loading, error } = usePayments(userId);
  console.log('💳 [PAYMENTS PAGE] Hook usePayments retornou:', {
    loading,
    error,
    paymentsCount: payments.length,
    payments: payments.map(p => ({ id: p.id, amount: p.amount, status: p.status, date: p.payment_date }))
  })

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={{ id: 1, name: "Usuário Teste" }} />
      <div className="container mx-auto p-4">
        <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">&larr; Voltar ao Início</Link>
        <h1 className="text-2xl font-bold mb-6">Pagamentos</h1>

        {/* Payments List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Seus Pagamentos</h2>
          {loading && <p>Carregando pagamentos...</p>}
          {error && <p className="text-red-500">Erro: {error}</p>}
          <ul className="space-y-4">
            {payments.map((payment) => {
              console.log('💰 [PAYMENTS PAGE] Renderizando pagamento:', {
                id: payment.id,
                amount: payment.amount,
                formattedAmount: formatCurrency(payment.amount / 100),
                date: payment.payment_date,
                status: payment.status
              })
              return (
                <li key={payment.id} className="border border-gray-200 p-4 rounded-md">
                  <div className="flex justify-between items-center">
                    <div>
                      <p><strong>ID:</strong> {payment.id}</p>
                      <p><strong>Valor:</strong> {formatCurrency(payment.amount / 100)}</p>
                      <p><strong>Data:</strong> {new Date(payment.payment_date).toLocaleDateString('pt-BR')}</p>
                      <p><strong>Status:</strong> {payment.status}</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          {(() => {
            if (!loading && payments.length === 0) {
              console.log('📭 [PAYMENTS PAGE] Nenhum pagamento encontrado')
              return <p>Nenhum pagamento encontrado.</p>
            }
            return null
          })()}
        </div>
      </div>
    </div>
  );
};