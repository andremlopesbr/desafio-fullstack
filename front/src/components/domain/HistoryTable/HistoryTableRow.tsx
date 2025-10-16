import React from 'react'
import { TableRow, TableCell } from 'flowbite-react'
import { HistoryItem } from '../../../types'

interface HistoryTableRowProps {
  item: HistoryItem
  index: number
  formatCurrency: (value: number) => string
  formatDate: (dateString: string) => string
}

export const HistoryTableRow: React.FC<HistoryTableRowProps> = ({
  item,
  index,
  formatCurrency,
  formatDate
}) => {
  const { contract, payments } = item

  return (
    <TableRow className="bg-white" key={item.contract.id}>
      <TableCell className="bg-white font-medium text-gray-500 border-b border-gray-100">
        {index + 1}
      </TableCell>
      <TableCell className="bg-white font-medium text-gray-500 border-b border-gray-100">
        #{contract.id}
      </TableCell>
      <TableCell className="bg-white border-b border-gray-100">
        <div className="font-medium text-gray-900">{contract.plan.description}</div>
        <div className="text-sm text-gray-500">
          {contract.plan.numberOfClients} vistorias, {contract.plan.gigabytesStorage} GB
        </div>
      </TableCell>

      <TableCell className="bg-white border-b border-gray-100">
        <div className="text-lg font-medium text-green-600">
          {formatCurrency(contract.plan.price)}
        </div>
        <div className="text-sm text-gray-500">por mês</div>
      </TableCell>

      <TableCell className="bg-white border-b border-gray-100">
        {(() => {
          const sortedPayments = [...payments].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
          const latestPayment =
            sortedPayments.length > 0 ? sortedPayments[sortedPayments.length - 1] : null

          if (!latestPayment) return <span className="text-gray-400 text-sm">Nenhum desconto</span>

          const {
            prorated_old = 0,
            prorated_new = 0,
            applied_credits = 0,
            discount_applied = 0,
            credits_generated = 0
          } = latestPayment
          const discountLines = []
          let scenario = 'OTHER'
          if (
            prorated_old === 0 &&
            applied_credits === 0 &&
            discount_applied === 0 &&
            credits_generated === 0
          ) {
            scenario = 'INITIAL_CONTRACT'
          } else if (prorated_new > prorated_old && credits_generated === 0 && prorated_old > 0) {
            scenario = 'UPGRADE'
          } else if (prorated_old > prorated_new && credits_generated > 0) {
            scenario = 'DOWNGRADE'
          } else if (applied_credits > 0 && prorated_old === 0) {
            scenario = 'CREDITS_APPLIED'
          }
          if (scenario === 'INITIAL_CONTRACT') {
            return <span className="text-gray-400 text-sm">Nenhum desconto</span>
          }

          if (scenario === 'UPGRADE') {
            if (applied_credits > 0) {
              discountLines.push(`Créditos Aplicados: ${formatCurrency(applied_credits)}`)
            }

            if (prorated_old > 0) {
              const proratedText = `Pro-rata: ${formatCurrency(prorated_old)} [de ${formatCurrency(prorated_old)}]`
              discountLines.push(proratedText)
            }
          }

          if (scenario === 'DOWNGRADE') {
            if (prorated_old > 0) {
              const proratedText = `Pro-rata: ${formatCurrency(prorated_old)} [de ${formatCurrency(prorated_old)}]`
              discountLines.push(proratedText)
            }
            if (credits_generated > 0) {
              discountLines.push(`Créditos Gerados: ${formatCurrency(credits_generated)}`)
            }
          }

          if (scenario === 'CREDITS_APPLIED' && applied_credits > 0) {
            discountLines.push(`Créditos Aplicados: ${formatCurrency(applied_credits)}`)
          }

          if (scenario === 'OTHER') {
            if (prorated_old > 0) {
              const proratedText = `Pro-rata: ${formatCurrency(prorated_old)}`
              discountLines.push(proratedText)
            }

            if (applied_credits > 0) {
              discountLines.push(`Créditos Aplicados: ${formatCurrency(applied_credits)}`)
            }

            if (credits_generated > 0) {
              discountLines.push(`Créditos Gerados: ${formatCurrency(credits_generated)}`)
            }
          }

          if (discount_applied > 0) {
            discountLines.push(`Total de Desconto: ${formatCurrency(discount_applied)}`)
          }

          if (latestPayment.amount === 0) {
            discountLines.push(`Pago: ${formatCurrency(0)} (total descontado)`)
          }

          if (discountLines.length === 0) {
            return <span className="text-gray-400 text-sm">Nenhum desconto</span>
          }

          return (
            <div className="space-y-1 text-sm">
              {discountLines.map((line, index) => (
                <div
                  key={index}
                  className={
                    line.includes('Pago:') && line.includes('(total descontado)')
                      ? 'font-semibold text-green-600'
                      : line.includes('Total de Desconto')
                        ? 'font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1'
                        : line.includes('Créditos Aplicados')
                          ? 'text-green-600 font-medium'
                          : line.includes('Créditos Gerados')
                            ? 'text-purple-600 font-medium'
                            : line.includes('Pro-rata:')
                              ? 'text-blue-600 font-medium'
                              : 'text-gray-600'
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          )
        })()}
      </TableCell>

      <TableCell className="bg-white border-b border-gray-100">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            contract.status === 'active'
              ? 'bg-green-100 text-green-800'
              : contract.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {contract.status === 'active'
            ? 'Ativo'
            : contract.status === 'cancelled'
              ? 'Cancelado'
              : contract.status}
        </span>
        <div className="text-sm text-gray-500 mt-1">
          Contratado: {contract.start_date ? formatDate(contract.start_date) : 'N/A'}
        </div>
      </TableCell>

      <TableCell className="bg-white border-b border-gray-100">
        {(() => {
          const uniquePaymentsMap = new Map()
          const sortedPayments = [...payments].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          sortedPayments.forEach(payment => {
            const dateKey = payment.payment_date.split('T')[0]
            if (!uniquePaymentsMap.has(dateKey)) {
              uniquePaymentsMap.set(dateKey, payment)
            }
          })
          const uniquePayments = Array.from(uniquePaymentsMap.values())

          return uniquePayments.length > 0 ? (
            <div className="space-y-2">
              {uniquePayments.map(payment => {
                const formattedAmount = `${formatCurrency(payment.amount)}`
                const formattedDate = formatDate(payment.payment_date)
                const statusText = payment.status === 'paid' ? 'Pago' : 'Pendente'

                return (
                  <div
                    key={payment.id}
                    className="bg-gray-50 p-2 rounded text-sm border border-gray-200"
                  >
                    <div className="font-medium text-gray-900">{formattedAmount}</div>
                    <div className="text-gray-600">{formattedDate}</div>
                    <span className="text-green-600 font-medium">{statusText}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-gray-50 p-2 rounded text-sm border border-gray-200">
              <div className="font-medium text-gray-900">R$ 0,00</div>
              <div className="text-gray-600">{formatDate(new Date().toISOString())}</div>
              <span className="text-green-600 font-medium">Pago</span>
            </div>
          )
        })()}
      </TableCell>
    </TableRow>
  )
}
