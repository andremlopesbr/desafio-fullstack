/**
 * Utilitários para operações de API
 *
 * Este arquivo centraliza funções comuns utilizadas pelos contextos React
 * para buscar dados de APIs, evitando duplicação de código e melhorando
 * a manutenibilidade.
 */

/**
 * Interface para configurações de requisição avançadas
 */
export interface FetchConfig {
  timeout?: number
  retries?: number
  retryDelay?: number
  signal?: AbortSignal
}

/**
 * Função genérica para buscar dados de uma API
 *
 * Esta função gerencia o estado de carregamento e erro automaticamente,
 * além de permitir transformação personalizada dos dados recebidos.
 * Inclui suporte a AbortController e configurações avançadas.
 *
 * @template T - Tipo dos dados esperados após transformação
 * @param url - URL completa da API para fazer a requisição
 * @param setData - Função para definir os dados no estado
 * @param setLoading - Função para definir o estado de carregamento
 * @param setError - Função para definir mensagens de erro
 * @param transform - Função opcional para transformar dados da API
 * @param config - Configurações avançadas opcionais
 * @returns Promise que resolve quando a operação é concluída
 *
 * @example
 * ```typescript
 * // Uso básico
 * await fetchData(
 *   'https://api.example.com/users',
 *   setUsers,
 *   setLoading,
 *   setError,
 *   extractArrayFromData<User>()
 * );
 *
 * // Uso avançado com AbortController
 * const controller = new AbortController()
 * await fetchData(
 *   'https://api.example.com/users',
 *   setUsers,
 *   setLoading,
 *   setError,
 *   extractArrayFromData<User>(),
 *   { timeout: 5000, signal: controller.signal }
 * );
 * ```
 */
export async function fetchData<T>(
  url: string,
  setData: (data: T) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  transform?: (data: unknown) => T,
  config?: FetchConfig
): Promise<void> {
  setLoading(true)
  setError(null)

  // Configurações padrão
  const timeout = config?.timeout ?? 10000 // 10 segundos por padrão
  const retries = config?.retries ?? 0

  try {
    // Cria AbortController se não foi fornecido
    const controller = config?.signal ? undefined : new AbortController()
    const signal = config?.signal || controller?.signal

    // Configura timeout
    const timeoutId = setTimeout(() => {
      controller?.abort()
    }, timeout)

    // Tenta fazer a requisição com retry se configurado
    let lastError: Error
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Erro HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        const transformedData = transform ? transform(data) : data
        setData(transformedData)
        return // Sucesso, sai da função

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido')

        // Se é erro de abort, não tenta novamente
        if (lastError.name === 'AbortError') {
          throw lastError
        }

        // Se não é a última tentativa, espera antes de tentar novamente
        if (attempt < retries) {
          const delay = (config?.retryDelay ?? 1000) * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError!

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    setError(message)
    // Erro tratado pelo sistema de error boundary - removido console.log
  } finally {
    setLoading(false)
  }
}

/**
 * Versão moderna da função fetchData que retorna Promise diretamente
 * Ideal para uso com TanStack Query e outros sistemas modernos
 *
 * @template T - Tipo dos dados esperados após transformação
 * @param url - URL completa da API para fazer a requisição
 * @param transform - Função opcional para transformar dados da API
 * @param config - Configurações avançadas opcionais
 * @returns Promise com os dados transformados
 */
export async function fetchDataDirect<T>(
  url: string,
  transform?: (data: unknown) => T,
  config?: FetchConfig
): Promise<T> {
  const timeout = config?.timeout ?? 10000
  const retries = config?.retries ?? 0

  // Cria AbortController se não foi fornecido
  const controller = config?.signal ? undefined : new AbortController()
  const signal = config?.signal || controller?.signal

  // Configura timeout
  const timeoutId = setTimeout(() => {
    controller?.abort()
  }, timeout)

  try {
    // Tenta fazer a requisição com retry se configurado
    let lastError: Error
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          signal,
          headers: {
            'Content-Type': 'application/json',
          }
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Erro HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return transform ? transform(data) : data as T

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido')

        // Se é erro de abort, não tenta novamente
        if (lastError.name === 'AbortError') {
          throw lastError
        }

        // Se não é a última tentativa, espera antes de tentar novamente
        if (attempt < retries) {
          const delay = (config?.retryDelay ?? 1000) * Math.pow(2, attempt)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // Se chegou aqui, todas as tentativas falharam
    throw lastError!

  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error // Re-throw abort errors
    }
    throw new Error(`Erro na requisição: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
  }
}

/**
 * Transformador padrão para APIs que retornam {data: [...]}
 *
 * Muitas APIs seguem o padrão de retornar dados envelopados em um objeto
 * com propriedade 'data'. Esta função extrai o array dessa propriedade
 * quando necessário, mantendo compatibilidade com diferentes formatos.
 *
 * @template T - Tipo dos itens do array
 * @param data - Dados brutos retornados pela API
 * @returns Array tipado ou array vazio em caso de erro
 *
 * @example
 * ```typescript
 * // API retorna: {data: [{id: 1, name: "João"}, {id: 2, name: "Maria"}]}
 * // Resultado: [{id: 1, name: "João"}, {id: 2, name: "Maria"}]
 * const users = extractArrayFromData<User>()(apiResponse);
 * ```
 */
export function extractArrayFromData<T>(): (data: unknown) => T[] {
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

/**
 * Transformador para dados de saldo
 *
 * Extrai o valor numérico da propriedade 'total_balance' em respostas
 * da API que seguem o formato {total_balance: number}.
 *
 * @param data - Dados brutos retornados pela API
 * @returns Valor numérico do saldo ou 0 em caso de erro
 *
 * @example
 * ```typescript
 * // API retorna: {total_balance: 150.50}
 * // Resultado: 150.50
 * const balance = extractBalanceFromData()(apiResponse);
 * ```
 */
export function extractBalanceFromData(): (data: unknown) => number {
  return (data: unknown) => {
    if (data && typeof data === 'object' && 'total_balance' in data) {
      const balanceData = data as { total_balance: number }
      return balanceData.total_balance || 0
    }

    return 0
  }
}
