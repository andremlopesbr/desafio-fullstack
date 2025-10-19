import { useQuery } from '@tanstack/react-query'
import { getPlans } from '../../services/api'

/**
 * Hook personalizado para buscar planos usando TanStack Query
 * Usa o serviço de API simplificado
 */
export const usePlansQuery = () => {
  return useQuery({
    queryKey: ['plans'],
    queryFn: getPlans,
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000 // 10 minutos
  })
}
