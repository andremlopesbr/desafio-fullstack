import { useQuery } from '@tanstack/react-query'
import { fetchDataDirect } from '../utils/apiUtils'
import { CreditCalculationResult } from '../types/api'

/**
 * Hook personalizado para buscar cálculo de crédito usando TanStack Query
 * Usa fetchData
 */
export const useCreditCalculation = (contractId?: number, planId?: number) => {
  return useQuery({
    queryKey: ['credit-calculation', contractId, planId],
    queryFn: async (): Promise<CreditCalculationResult> => {
      if (!contractId) {
        throw new Error('ContractId é necessário para buscar cálculo de crédito')
      }

      if (!planId) {
        throw new Error('PlanId é necessário para buscar cálculo de crédito')
      }

      try {
        // Construir URL com parâmetros obrigatórios
        const url = new URL(
          `${import.meta.env.VITE_API_URL}/contracts/${contractId}/credit-calculation`
        )
        url.searchParams.set('plan_id', planId.toString())

        const data = await fetchDataDirect<CreditCalculationResult>(
          url.toString(),
          data => {
            // Validação básica dos dados retornados
            if (!data || typeof data !== 'object') {
              throw new Error('Dados de resposta inválidos')
            }
            return data as CreditCalculationResult
          },
          {
            timeout: 15000, // 15 segundos para cálculos mais complexos
            retries: 3, // 3 tentativas extras para cálculos críticos
            retryDelay: 1000 // 1 segundo entre tentativas
          }
        )

        return data
      } catch (error) {
        // Tratamento específico para diferentes tipos de erro
        if (error instanceof Error) {
          // Se é erro de HTTP específico, mantém mensagem personalizada
          if (error.message.includes('Erro HTTP')) {
            const statusMatch = error.message.match(/Erro HTTP (\d+)/)
            if (statusMatch) {
              const status = parseInt(statusMatch[1])
              switch (status) {
                case 404:
                  throw new Error('Contrato não encontrado ou cálculo não disponível')
                case 401:
                  throw new Error('Não autorizado para acessar cálculo de crédito')
                case 403:
                  throw new Error('Acesso negado ao cálculo de crédito')
                case 429:
                  throw new Error('Muitas requisições. Tente novamente em alguns instantes')
                case 500:
                  throw new Error('Erro interno do servidor. Tente novamente mais tarde')
                case 503:
                  throw new Error('Serviço temporariamente indisponível')
                default:
                  throw error // Mantém erro original para outros códigos
              }
            }
          }

          // Re-throw fetch errors (rede, timeout, etc.)
          if (error.name === 'TypeError') {
            throw new Error('Erro de conexão. Verifique sua internet e tente novamente')
          }
        }
        throw error
      }
    },
    enabled: !!contractId && !!planId, // Só executa se ambos os parâmetros estiverem presentes
    // Cache por 1 minuto para cálculos de crédito (dados dinâmicos)
    staleTime: 1 * 60 * 1000, // 1 minute
    // Manter em cache por 2 minutos
    gcTime: 2 * 60 * 1000, // 2 minutes
    // Configurações de retry para melhor resiliência
    retry: (failureCount, error) => {
      // Não retry em erros específicos
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        if (
          errorMessage.includes('contrato não encontrado') ||
          errorMessage.includes('não autorizado') ||
          errorMessage.includes('acesso negado')
        ) {
          return false
        }
      }

      // Retry até 3 vezes para outros erros
      return failureCount < 3
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
    // Placeholder data para melhorar UX durante carregamento inicial
    placeholderData: previousData => previousData,
    // Meta para debugging
    meta: {
      errorMessage: 'Falha ao carregar cálculo de crédito'
    }
  })
}
