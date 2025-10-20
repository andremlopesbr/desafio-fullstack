import { useState, useEffect } from 'react'

/**
 * Hook personalizado para debounce de funções
 * Útil para evitar múltiplas execuções rápidas de operações como refresh
 */
export const useDebounce = <T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number
): [T, () => void] => {
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null)

  const debouncedCallback = ((...args: Parameters<T>) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const newTimer = setTimeout(() => {
      callback(...args)
    }, delay)

    setDebounceTimer(newTimer)
  }) as T

  const cancel = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      setDebounceTimer(null)
    }
  }

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return [debouncedCallback, cancel]
}

/**
 * Hook personalizado para operações de refresh com debounce
 * Evita múltiplas chamadas simultâneas de refresh
 */
export const useDebouncedRefresh = (
  refreshFn: () => void | Promise<void>,
  delay: number = 300
) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [debouncedRefresh, cancelRefresh] = useDebounce(async () => {
    try {
      setIsRefreshing(true)
      await refreshFn()
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Erro no refresh com debounce:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, delay)

  return {
    debouncedRefresh,
    cancelRefresh,
    isRefreshing
  }
}

/**
 * Hook para múltiplas operações de refresh com debounce agrupado
 * Executa múltiplas operações de forma otimizada
 */
export const useDebouncedBatchRefresh = (
  refreshFunctions: Array<() => void | Promise<void>>,
  delay: number = 500
) => {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [debouncedBatchRefresh, cancelBatchRefresh] = useDebounce(async () => {
    try {
      setIsRefreshing(true)

      // Executa todas as funções de refresh em paralelo
      await Promise.all(
        refreshFunctions.map(fn => Promise.resolve(fn()))
      )
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Erro no batch refresh com debounce:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, delay)

  return {
    debouncedBatchRefresh,
    cancelBatchRefresh,
    isRefreshing
  }
}