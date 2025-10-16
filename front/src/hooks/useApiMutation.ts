import { useState } from 'react'

/**
 * Hook base para operações de mutação (POST, PUT, PATCH, DELETE)
 * Implementa padrão Template Method para eliminar duplicação
 */
export interface ApiMutationState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApiMutation<T = unknown>() {
  const [state, setState] = useState<ApiMutationState<T>>({
    data: null,
    loading: false,
    error: null
  })

  const execute = async <TInput = unknown>(
    url: string,
    options: RequestInit = {},
    input?: TInput
  ): Promise<T | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const config: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      }

      if (input) {
        config.body = JSON.stringify(input)
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}${url}`, config)

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setState(prev => ({ ...prev, data, loading: false }))
      return data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
      setState(prev => ({ ...prev, error: errorMessage, loading: false }))
      return null
    }
  }

  const reset = () => {
    setState({
      data: null,
      loading: false,
      error: null
    })
  }

  return {
    ...state,
    execute,
    reset
  }
}
