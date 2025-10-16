import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCurrency } from '../../utils/formatters'
import { useUserBalance } from '../../hooks/useUserBalance'
import { useAuth } from '../../hooks/useAuth'

interface UserBalanceProps {
  className?: string
  showBackLink?: boolean
  showRefreshButton?: boolean
  autoRefresh?: boolean
  refreshInterval?: number // em segundos
}

const UserBalance: React.FC<UserBalanceProps> = ({
  className = '',
  showBackLink = true,
  showRefreshButton = false,
  autoRefresh = false,
  refreshInterval = 30
}) => {
  const { user: authUser } = useAuth()
  const { balance, balanceLoading, balanceError, refreshBalance } = useUserBalance(authUser?.id)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  React.useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      refreshBalance()
      setLastRefresh(new Date())
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, refreshBalance])

  const handleRefresh = async () => {
    await refreshBalance()
    setLastRefresh(new Date())
  }

  const formattedBalance = formatCurrency(typeof balance === 'number' ? balance : 0)

  const getBalanceColor = () => {
    if (balanceError) return 'text-red-900 bg-red-50 border-red-200'
    if (balanceLoading) return 'text-gray-900 bg-gray-50 border-gray-200'
    if (balance && balance > 0) return 'text-green-900 bg-green-50 border-green-200'
    return 'text-blue-900 bg-blue-50 border-blue-200'
  }

  const getBalanceTextColor = () => {
    if (balanceError) return 'text-red-800'
    if (balanceLoading) return 'text-gray-600'
    if (balance && balance > 0) return 'text-green-800'
    return 'text-blue-800'
  }

  return (
    <div
      className={`flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 ${className}`}
    >
      {showBackLink && (
        <Link
          to="/"
          className="text-blue-500 hover:text-blue-700 hover:underline mb-2 sm:mb-0 transition-colors"
        >
          &larr; Voltar aos Planos
        </Link>
      )}

      <div className="flex items-center gap-2 sm:gap-3">
        <div className={`${getBalanceColor()} border rounded-lg px-3 sm:px-4 py-2`}>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getBalanceTextColor()}`}>Saldo:</span>
            <span className="text-base sm:text-lg font-bold text-blue-900">
              {balanceLoading ? (
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  Carregando...
                </span>
              ) : balanceError ? (
                'Erro ao carregar'
              ) : (
                formattedBalance
              )}
            </span>
          </div>

          {balanceError && <div className="text-xs text-red-600 mt-1">{balanceError}</div>}

          {lastRefresh && !balanceLoading && !balanceError && (
            <div className="text-xs text-gray-500 mt-1">
              Última atualização: {lastRefresh.toLocaleTimeString('pt-BR')}
            </div>
          )}
        </div>

        {showRefreshButton && (
          <button
            onClick={handleRefresh}
            disabled={balanceLoading}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar saldo"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

export default UserBalance
