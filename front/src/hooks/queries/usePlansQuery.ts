import { useQuery } from '@tanstack/react-query'
import { extractArrayFromData } from '../../utils/apiUtils'
import { Plan } from '../../types/api'

/**
 * Hook personalizado para buscar planos usando TanStack Query
 * Substitui o contexto PlansContext por useQuery para melhor performance
 */
export const usePlansQuery = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: async (): Promise<Plan[]> => {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/plans`)
      if (!response.ok) {
        throw new Error(`Erro ao buscar planos: ${response.statusText}`)
      }

      const data = await response.json()
      return extractArrayFromData<Plan>()(data)
    },
    // Cache por 5 minutos para planos (dados relativamente estáticos)
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Manter em cache por 10 minutos
    gcTime: 10 * 60 * 1000 // 10 minutes
  })
}
