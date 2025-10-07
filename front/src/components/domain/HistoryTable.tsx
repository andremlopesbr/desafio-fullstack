import React from 'react';

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

interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface HistoryItem {
  contract: Contract;
  payments: Payment[];
  discountDetails: {
    prorrata: number;
    balanceCredit: number;
    totalDiscount: number;
  };
}

interface HistoryTableProps {
  historyItems: HistoryItem[];
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  historyItems,
  formatCurrency,
  formatDate,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Plano
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Valor
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descontos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Pagamentos
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {historyItems.map(({ contract, payments, discountDetails }) => (
            <tr key={contract.id} className="hover:bg-gray-50">
              {/* Plano */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div>
                  <div className="font-medium text-gray-900">{contract.plan.description}</div>
                  <div className="text-sm text-gray-500">
                    {contract.plan.numberOfClients} vistorias, {contract.plan.gigabytesStorage} GB
                  </div>
                </div>
              </td>

              {/* Valor */}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-lg font-medium text-green-600">
                  {formatCurrency(contract.plan.price)}
                </div>
                <div className="text-sm text-gray-500">por mês</div>
              </td>

              {/* Descontos */}
              <td className="px-6 py-4">
                <div className="space-y-1 text-sm">
                  <div className={discountDetails.balanceCredit > 0 ? 'text-green-600' : 'text-gray-400'}>
                    Créditos: {discountDetails.balanceCredit > 0 ? formatCurrency(discountDetails.balanceCredit) : '0'}
                  </div>
                  <div className={discountDetails.prorrata > 0 ? 'text-blue-600' : 'text-gray-400'}>
                    Pro-rata: {discountDetails.prorrata > 0 ? formatCurrency(discountDetails.prorrata) : '0'}
                  </div>
                  <div className={`font-medium ${discountDetails.totalDiscount > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                    Total: {discountDetails.totalDiscount > 0 ? formatCurrency(discountDetails.totalDiscount) : '0'}
                  </div>
                </div>
              </td>

              {/* Status */}
              <td className="px-6 py-4 whitespace-nowrap">
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
                <div className="text-sm text-gray-500 mt-1">
                  Contratado: {contract.start_date ? formatDate(contract.start_date) : 'N/A'}
                </div>
              </td>

              {/* Pagamentos */}
              <td className="px-6 py-4">
                {payments.length > 0 ? (
                  <div className="space-y-2">
                    {payments.map((payment) => (
                      <div key={payment.id} className="bg-gray-50 p-2 rounded text-sm">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(payment.amount / 100)}
                        </div>
                        <div className="text-gray-600">
                          {formatDate(payment.payment_date)}
                        </div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
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
                ) : (
                  <span className="text-gray-400 text-sm">Nenhum pagamento</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};