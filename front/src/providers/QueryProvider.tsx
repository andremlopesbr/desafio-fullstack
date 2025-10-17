import { ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '../services/queryClient'

interface QueryProviderProps {
  children: ReactNode
}

/**
 * Provider do TanStack Query que configura o QueryClient para toda a aplicação.
 * Inclui ferramentas de desenvolvimento para debug e monitoramento.
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* React Query DevTools - só aparece em desenvolvimento */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  )
}
