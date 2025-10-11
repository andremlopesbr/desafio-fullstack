import React from 'react';
import { TableRow, TableCell } from "flowbite-react";

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
  discount_applied?: number;
  prorated_old?: number;
  prorated_new?: number;
  applied_credits?: number;
}

interface HistoryItem {
  contract: Contract;
  payments: Payment[];
}

interface HistoryTableRowProps {
  item: HistoryItem;
  index: number;
  currentPage: number;
  pageSize: number;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}

/**
 * Componente responsável apenas pela renderização de uma linha da tabela
 * Segue princípio SRP - única responsabilidade: renderizar linha específica
 */
export const HistoryTableRow: React.FC<HistoryTableRowProps> = ({
  item,
  index,
  currentPage,
  pageSize,
  formatCurrency,
  formatDate
}) => {
  const { contract, payments } = item;

  return (
    <TableRow>
      <TableCell className="bg-white font-medium text-gray-500">
        {(currentPage - 1) * pageSize + index + 1}
      </TableCell>
      <TableCell className="bg-white">
        <div className="font-medium text-gray-900">
          {contract.plan.description}
        </div>
        <div className="text-sm text-gray-500">
          {contract.plan.numberOfClients} vistorias,{" "}
          {contract.plan.gigabytesStorage} GB
        </div>
      </TableCell>

      <TableCell className="bg-white">
        <div className="text-lg font-medium text-green-600">
          {formatCurrency(contract.plan.price)}
        </div>
        <div className="text-sm text-gray-500">por mês</div>
      </TableCell>

      <TableCell className="bg-white">
        {(() => {
          const sortedPayments = [...payments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          const latestPayment = sortedPayments.length > 0 ? sortedPayments[sortedPayments.length - 1] : null;
          if (!latestPayment) return <span className="text-gray-400 text-sm">Nenhum desconto</span>;

          const { prorated_old = 0, prorated_new = 0, applied_credits = 0, discount_applied = 0 } = latestPayment;
          const discountLines = [];

          if (applied_credits > 0) {
            discountLines.push(`Créditos: ${formatCurrency(applied_credits)}`);
          }

          if (prorated_old > 0) {
            if (prorated_old > prorated_new) { // Downgrade
              const prorataUsed = Math.min(prorated_old, prorated_new);
              discountLines.push(`Pro-rata: ${formatCurrency(prorataUsed)} [de ${formatCurrency(prorated_old)}]`);
              const creditGenerated = prorated_old - prorated_new;
              if (creditGenerated > 0) {
                discountLines.push(`À creditar: ${formatCurrency(creditGenerated)}`);
              }
            } else { // Upgrade
              discountLines.push(`Pro-rata: ${formatCurrency(prorated_old)} [de ${formatCurrency(prorated_old)}]`);
            }
          }

          if (discount_applied > 0) {
            discountLines.push(`Total de Desconto: ${formatCurrency(discount_applied)}`);
          }

          if (discountLines.length === 0) {
            return <span className="text-gray-400 text-sm">Nenhum desconto</span>;
          }

          return (
            <div className="space-y-1 text-sm">
              {discountLines.map((line, index) => (
                <div key={index} className={line.includes('Total') ? 'font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1' : (line.includes('Créditos') ? 'text-green-600' : 'text-blue-600')}>
                  {line}
                </div>
              ))}
            </div>
          );
        })()}
      </TableCell>

      <TableCell className="bg-white">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            contract.status === "active"
              ? "bg-green-100 text-green-800"
              : contract.status === "cancelled"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {contract.status === "active"
            ? "Ativo"
            : contract.status === "cancelled"
            ? "Cancelado"
            : contract.status}
        </span>
        <div className="text-sm text-gray-500 mt-1">
          Contratado:{" "}
          {contract.start_date
            ? formatDate(contract.start_date)
            : "N/A"}
        </div>
      </TableCell>

      <TableCell className="bg-white">
        {(() => {
          const uniquePaymentsMap = new Map();
          const sortedPayments = [...payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          sortedPayments.forEach((payment) => {
            const dateKey = payment.payment_date.split('T')[0];
            if (!uniquePaymentsMap.has(dateKey)) {
              uniquePaymentsMap.set(dateKey, payment);
            }
          });
          const uniquePayments = Array.from(uniquePaymentsMap.values());

          return uniquePayments.length > 0 ? (
            <div className="space-y-2">
              {uniquePayments.map((payment) => (
                <div
                  key={payment.id}
                  className="bg-gray-50 p-2 rounded text-sm"
                >
                  <div className="font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </div>
                  <div className="text-gray-600">
                    {formatDate(payment.payment_date)}
                  </div>
                  <span
                    className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                      payment.status === "paid"
                        ? "bg-green-100 text-green-800"
                        : payment.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {payment.status === "paid"
                      ? "Pago"
                      : payment.status === "pending"
                      ? "Pendente"
                      : payment.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">
              Nenhum pagamento
            </span>
          );
        })()}
      </TableCell>
    </TableRow>
  );
};