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
   credits_generated?: number;
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

          const { prorated_old = 0, prorated_new = 0, applied_credits = 0, discount_applied = 0, credits_generated = 0 } = latestPayment;
          const discountLines = [];

          // Cenário Prático 1: Contratação Inicial
          if (prorated_old === 0 && applied_credits === 0 && discount_applied === 0) {
            return <span className="text-gray-400 text-sm">Nenhum desconto</span>;
          }

          // Cenário Prático 5: Upgrade com Créditos
          if (applied_credits > 0) {
            discountLines.push(`Créditos: R$ ${formatCurrency(applied_credits)} [de R$ ${formatCurrency(applied_credits)}]`);
          }

          // Cenário Prático 2/3/4: Pro-rata (Upgrade/Downgrade)
          if (prorated_old > 0) {
            if (prorated_old > prorated_new) {
              // Cenário Prático 4: Downgrade - DEBUG.md Cenário 4
              const prorataUsed = Math.min(prorated_old, prorated_new);
              discountLines.push(`Pro-rata: R$ ${formatCurrency(prorataUsed)} [de R$ ${formatCurrency(prorated_old)}]`);

              // Mostrar crédito gerado (vem do banco - DEBUG.md linha 196)
              if (credits_generated > 0) {
                discountLines.push(`À creditar: R$ ${formatCurrency(credits_generated)}`);
              }
            } else {
              // Cenário Prático 2/3: Upgrade - DEBUG.md Cenários 2 e 3
              discountLines.push(`Pro-rata: R$ ${formatCurrency(prorated_old)} [de R$ ${formatCurrency(prorated_old)}]`);
            }
          }

          // Total de Desconto - sempre mostrar quando há descontos
          if (discount_applied > 0) {
            discountLines.push(`Total de Desconto: R$ ${formatCurrency(discount_applied)}`);
          }

          return (
            <div className="space-y-1 text-sm">
              {discountLines.map((line, index) => (
                <div key={index} className={
                  line.includes('Total de Desconto')
                    ? 'font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1'
                    : line.includes('Créditos')
                    ? 'text-green-600'
                    : line.includes('À creditar')
                    ? 'text-purple-600'
                    : 'text-blue-600'
                }>
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
              {uniquePayments.map((payment) => {
                const formattedAmount = `R$ ${formatCurrency(payment.amount)}`;
                const formattedDate = formatDate(payment.payment_date);
                const statusText = payment.status === "paid" ? "Pago" : "Pendente";

                return (
                  <div
                    key={payment.id}
                    className="bg-gray-50 p-2 rounded text-sm"
                  >
                    <div className="font-medium text-gray-900">
                      {formattedAmount}
                    </div>
                    <div className="text-gray-600">
                      {formattedDate}
                    </div>
                    <span className="text-green-600 font-medium">
                      {statusText}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50 p-2 rounded text-sm">
              <div className="font-medium text-gray-900">
                R$ 0,00
              </div>
              <div className="text-gray-600">
                {formatDate(new Date().toISOString())}
              </div>
              <span className="text-green-600 font-medium">
                Pago
              </span>
            </div>
          );
        })()}
      </TableCell>
    </TableRow>
  );
};