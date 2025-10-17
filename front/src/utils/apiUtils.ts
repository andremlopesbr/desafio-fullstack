/**
 * Utilitários para operações de API
 *
 * Este arquivo centraliza funções comuns utilizadas pelos contextos React
 * para buscar dados de APIs, evitando duplicação de código e melhorando
 * a manutenibilidade.
 */

/**
 * Função genérica para buscar dados de uma API
 *
 * Esta função gerencia o estado de carregamento e erro automaticamente,
 * além de permitir transformação personalizada dos dados recebidos.
 *
 * @template T - Tipo dos dados esperados após transformação
 * @param url - URL completa da API para fazer a requisição
 * @param setData - Função para definir os dados no estado
 * @param setLoading - Função para definir o estado de carregamento
 * @param setError - Função para definir mensagens de erro
 * @param transform - Função opcional para transformar dados da API
 * @returns Promise que resolve quando a operação é concluída
 *
 * @example
 * ```typescript
 * await fetchData(
 *   'https://api.example.com/users',
 *   setUsers,
 *   setLoading,
 *   setError,
 *   extractArrayFromData<User>()
 * );
 * ```
 */
export async function fetchData<T>(
  url: string,
  setData: (data: T) => void,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  transform?: (data: unknown) => T
): Promise<void> {
  setLoading(true)
  setError(null)

  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Failed to fetch from ${url}`)

    const data = await response.json()
    const transformedData = transform ? transform(data) : data
    setData(transformedData)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido'
    setError(message)
    // Erro tratado pelo sistema de error boundary - removido console.log
  } finally {
    setLoading(false)
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
