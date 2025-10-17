import { useQuery } from '@tanstack/react-query'
import { fetchDataDirect } from '../../utils/apiUtils'
import { Plan } from '../../types/api'

/**
 * Hook personalizado para buscar planos usando TanStack Query
 * Refatorado para usar fetchData centralizado com AbortController e melhor tratamento de erro
 */
export const usePlansQuery = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async (): Promise<Plan[]> => {
      const url = `${import.meta.env.VITE_API_URL}/plans`
      return fetchDataDirect<Plan[]>(
        url,
        (data) => {
          // Transforma dados usando a função utilitária existente
          const extractArrayFromData = <T>(): ((data: unknown) => T[]) => {
            return (data: unknown) => {
              if (data && typeof data === 'object' && 'data' in data) {
                const apiResponse = data as { data: T[] }
                return Array.isArray(apiResponse.data) ? apiResponse.data : []
              }
              if (Array.isArray(data)) {
                return data
              }
              return []
            }
          }
          return extractArrayFromData<Plan>()(data)
        },
        {
          timeout: 8000, // 8 segundos (dados estáticos, pode ser mais rápido)
          retries: 2,    // 2 tentativas extras em caso de erro
          retryDelay: 1000 // 1 segundo entre tentativas
        }
      )
    },
    // Cache por 5 minutos para planos (dados relativamente estáticos)
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Manter em cache por 10 minutos
    gcTime: 10 * 60 * 1000, // 10 minutes
    // Retry automático configurado no queryClient para evitar duplicação
    retry: false // Desabilita retry do React Query pois já tratamos no fetchDataDirect
  })
}
