import { useGenericData } from './useGenericData'

/**
 * Factory para criar hooks de API padronizados
 * Implementa padrão Factory para eliminar duplicação e seguir princípio DRY
 */
export function createApiHook<T>(
  endpoint: string,
  transformData?: (data: unknown) => T,
  dataPropertyName?: string
) {
  return (userId: number) => {
    const result = useGenericData(async (id: number) => {
      const url = `${import.meta.env.VITE_API_URL}/${endpoint}?user_id=${id}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return transformData ? transformData(data) : data
    }, userId)
    const propertyName = dataPropertyName || endpoint
    return {
      [`${propertyName}`]: result.data,
      [`${propertyName}Loading`]: result.loading,
      [`refresh${propertyName.charAt(0).toUpperCase() + propertyName.slice(1)}`]: result.refetch,
      refetch: result.refetch
    }
  }
}

/**
 * Hook específico para dados que precisam de transformação especial
 */
export function createTransformingApiHook<T>(
  endpoint: string,
  transformer: (data: unknown) => T,
  dataPropertyName?: string
) {
  return (userId: number) => {
    const result = useGenericData(async () => {
      const url = `${import.meta.env.VITE_API_URL}/${endpoint}`
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      return transformer(data)
    }, userId)
    const propertyName = dataPropertyName || endpoint
    return {
      [`${propertyName}`]: result.data,
      [`${propertyName}Loading`]: result.loading,
      [`refresh${propertyName.charAt(0).toUpperCase() + propertyName.slice(1)}`]: result.refetch,
      refetch: result.refetch
    }
  }
}
