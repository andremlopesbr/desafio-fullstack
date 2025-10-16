import { useCreditTransactionHistory } from '../../hooks/useCreditTransactionHistory'
import { formatCurrency } from '../../utils/formatters'

interface CreditTransactionHistoryProps {
  userId: number
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR')
}

export const CreditTransactionHistory = ({ userId }: CreditTransactionHistoryProps) => {
  const { transactions, loading, error } = useCreditTransactionHistory(userId)
  const sortedTransactions = transactions.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-semibold mb-4">Histórico de Transações de Crédito</h2>

      {loading && <p>Carregando histórico de transações de crédito...</p>}

      {error && <p className="text-red-600">Erro ao carregar histórico: {error}</p>}

      {!loading && !error && sortedTransactions.length === 0 && (
        <p className="text-gray-500 text-center py-8">Nenhum histórico de transações encontrado.</p>
      )}

      {!loading && !error && sortedTransactions.length > 0 && (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descrição
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTransactions.map(transaction => (
                  <tr key={transaction.id}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.created_at)}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {transaction.description}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'credit'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'credit' ? 'Crédito' : 'Débito'}
                      </span>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                      <span
                        className={`${transaction.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {transaction.type === 'credit' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default CreditTransactionHistory
