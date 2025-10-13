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
      {/* Order Exibição */}
      <TableCell className="bg-white font-medium text-gray-500">
        {(currentPage - 1) * pageSize + index + 1}
      </TableCell>
      {/* Coluna ID */}
      <TableCell className="bg-white font-medium text-gray-500">
        #{contract.id}
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

          // DIAGNOSTIC LOGS - validar lógica de negócio conforme DEBUG.md
          console.log('=== DIAGNÓSTICO HistoryTableRow ===');
          console.log('Dados recebidos:', {
            prorated_old,
            prorated_new,
            applied_credits,
            discount_applied,
            credits_generated,
            amount: latestPayment.amount
          });

          // Validação: discount_applied deve ser ≤ prorated_old + applied_credits
          const expectedMaxDiscount = prorated_old + applied_credits;
          if (discount_applied > expectedMaxDiscount) {
            console.warn('⚠️ POSSÍVEL INCONSISTÊNCIA:', {
              discount_applied,
              expectedMaxDiscount,
              prorated_old,
              applied_credits,
              message: 'discount_applied > prorated_old + applied_credits'
            });
          }

          // Cenário Prático 1: Contratação Inicial
          if (prorated_old === 0 && applied_credits === 0 && discount_applied === 0) {
            console.log('✅ Cenário 1: Contratação Inicial - sem descontos');
            return <span className="text-gray-400 text-sm">Nenhum desconto</span>;
          }

          // Cenário Prático 5: Upgrade com Créditos
          if (applied_credits > 0) {
            console.log('✅ Cenário 5: Upgrade com Créditos aplicados:', applied_credits);
            discountLines.push(`Créditos: ${formatCurrency(applied_credits)} [de ${formatCurrency(applied_credits)}]`);
          }

          // Cenário Prático 2/3/4: Pro-rata (Upgrade/Downgrade)
          if (prorated_old > 0) {
            if (discount_applied < prorated_old || discount_applied == prorated_old) {
              // Cenário Prático 2/3: Upgrade - DEBUG.md Cenários 2 e 3
              console.log('✅ Cenário 2/3: Upgrade - discount_applied <= prorated_old:', discount_applied, '<=', prorated_old);
              discountLines.push(`Pro-rata: ${formatCurrency(discount_applied)} [de ${formatCurrency(prorated_old)}]`);
            } else {
              // Cenário quando discount_applied > prorated_old - mostra o valor utilizado do pro-rata
              console.log('✅ Cenário Especial: discount_applied > prorated_old:', discount_applied, '>', prorated_old);
              discountLines.push(`Pro-rata: ${formatCurrency(discount_applied)} [de ${formatCurrency(prorated_old)}]`);
            }
          }

          // Mostrar crédito gerado (vem do banco - DEBUG.md linha 196)
          if (credits_generated > 0) {
            console.log('✅ Downgrade com crédito gerado:', credits_generated);
            discountLines.push(`À creditar: ${formatCurrency(credits_generated)}`);
          }

          // Total de Desconto - sempre mostrar quando há descontos
          if (discount_applied > 0) {
            discountLines.push(`Total de Desconto: ${formatCurrency(discount_applied)}`);
          }

          console.log('✅ Exibição final - linhas de desconto:', discountLines);

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
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${contract.status === "active"
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
                const formattedAmount = `${formatCurrency(payment.amount)}`;
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