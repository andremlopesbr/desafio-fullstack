import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useContracts } from '../../hooks/useContracts'
import { usePayments } from '../../hooks/usePayments'
import { useUserBalance } from '../../hooks/useUserBalance'
import { useAuth } from '../../hooks/useAuth'
import { Breadcrumbs } from '../../components/ui'
import { HistoryTable } from '../../components/domain'
import Layout from '../../components/Layout'
import { formatCurrency } from '../../utils/formatters'
import { Payment } from '../../types'

export const History = () => {
  const { user } = useAuth()
  const userId = user?.id || 0
  const { contracts, contractsLoading, refreshContracts } = useContracts()

  const { payments, paymentsLoading, refreshPayments } = usePayments(userId)

  const { balance, refreshBalance } = useUserBalance(userId)

  const loadHistoryData = useCallback(async () => {
    await Promise.all([refreshContracts(), refreshPayments(), refreshBalance()])
  }, [refreshContracts, refreshPayments, refreshBalance])
  useEffect(() => {
    if (userId) {
      loadHistoryData()
    }
  }, [userId, loadHistoryData])

  const loading = contractsLoading || paymentsLoading

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const sortedContracts = [...contracts].sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1
    if (a.status !== 'active' && b.status === 'active') return 1

    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const historyItems = sortedContracts.map(contract => {
    const contractPayments = payments.filter((p: Payment) => p.contract_id === contract.id)

    return {
      contract,
      payments: contractPayments
    }
  })

  return (
    <Layout user={{ id: userId, name: user?.name || 'Usuário da Silva' }}>
      <Breadcrumbs items={[{ name: 'Histórico', href: '/history' }]} />

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6">
          <Link to="/" className="text-blue-500 hover:underline mb-2 sm:mb-0">
            &larr; Voltar aos Planos
          </Link>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 sm:px-4 py-2">
            <span className="text-sm font-medium text-blue-800">Saldo: </span>
            <span className="text-base sm:text-lg font-bold text-blue-900">
              {formatCurrency(typeof balance === 'number' ? balance : 0)}
            </span>
          </div>
        </div>

        <h1 className="text-orange-400 text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Meu Histórico
        </h1>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Planos Contratados</h2>

          {loading && <p className="text-center py-8">Atualizando histórico...</p>}

          <HistoryTable
            historyItems={historyItems}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
          />

          {!loading && historyItems.length === 0 && (
            <p className="text-gray-500 text-center py-8">Nenhum plano contratado ainda.</p>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default History
