import { useState, useEffect, useRef, useCallback } from 'react'
import { useErrorHandler } from './useErrorHandler'

/**
 * Hook genérico para gerenciar estado de dados de API com cache e controle de loading
 * Implementa padrão de cache baseado em userId para evitar requisições desnecessárias
 * Integrado com tratamento de erros centralizado
 */
export function useGenericData<T>(fetcher: (userId: number) => Promise<T>, userId: number) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const { setError, clearError, setRetry } = useErrorHandler()

  const hasFetchedRef = useRef(false)
  const lastUserIdRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const dataRef = useRef<T | null>(null) // ✅ Movido para o nível do componente

  const fetchData = useCallback(
    async (force = false) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()
      if (!force && hasFetchedRef.current && lastUserIdRef.current === userId && dataRef.current) {
        setData(dataRef.current) // Garantir que o estado esteja sincronizado
        return
      }

      setLoading(true)
      clearError()

      try {
        const result = await fetcher(userId)
        setData(result)
        dataRef.current = result // ✅ Atualizar ref também
        hasFetchedRef.current = true
        lastUserIdRef.current = userId
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        const errorObj = new Error(errorMessage)
        setError(errorObj, `Erro ao buscar dados do usuário ${userId}`)
        setRetry(() => fetchData(true))

        console.error('Erro ao buscar dados:', errorMessage)
      } finally {
        setLoading(false)
      }
    },
    [fetcher, userId, setError, clearError, setRetry]
  ) // ✅ Removido 'data' das dependências

  useEffect(() => {
    if (userId) {
      fetchData()
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [userId, fetchData])

  const refetch = useCallback(() => fetchData(true), [fetchData])

  return {
    data,
    loading,
    refetch
  }
}
