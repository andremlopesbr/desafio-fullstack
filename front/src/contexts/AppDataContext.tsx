import { ReactNode } from 'react'
import { ApiDataProvider } from './ApiDataContext'
import { PlansProvider } from './PlansContext'
import { ContractsProvider } from './ContractsContext'
import { PaymentsProvider } from './PaymentsContext'
import { BalanceProvider } from './BalanceContext'

interface AppDataProviderProps {
  children: ReactNode
}

export function AppDataProvider({ children }: AppDataProviderProps) {
  return (
    <ApiDataProvider>
      <PlansProvider>
        <ContractsProvider>
          <PaymentsProvider>
            <BalanceProvider>{children}</BalanceProvider>
          </PaymentsProvider>
        </ContractsProvider>
      </PlansProvider>
    </ApiDataProvider>
  )
}
