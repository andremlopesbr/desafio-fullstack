/**
 * Serviço para gerenciamento de filtros e ordenação de tabelas
 */
export interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

export interface FilterConfig {
  search: string
  status: string
}

export class TableFiltersService {
  /**
   * Filtra e ordena itens baseado na configuração
   */
  static filterAndSort<T extends Record<string, unknown>>(
    items: T[],
    filters: FilterConfig,
    sortConfig: SortConfig,
    searchFields: string[],
    statusFilter?: (item: T, status: string) => boolean
  ): T[] {
    let filtered = items
    if (filters.search) {
      filtered = filtered.filter(item =>
        searchFields.some(field =>
          String(item[field]).toLowerCase().includes(filters.search.toLowerCase())
        )
      )
    }
    if (filters.status && filters.status !== 'all' && statusFilter) {
      filtered = filtered.filter(item => statusFilter(item, filters.status))
    }
    return this.sortItems(filtered, sortConfig)
  }

  /**
   * Ordena itens baseado na configuração
   */
  private static sortItems<T extends Record<string, unknown>>(
    items: T[],
    sortConfig: SortConfig
  ): T[] {
    return [...items].sort((a, b) => {
      const aValue = a[sortConfig.field] as string | number
      const bValue = b[sortConfig.field] as string | number

      let comparison = 0
      if (aValue < bValue) comparison = -1
      if (aValue > bValue) comparison = 1

      return sortConfig.direction === 'asc' ? comparison : -comparison
    })
  }

  /**
   * Alterna direção de ordenação
   */
  static toggleSortDirection(direction: 'asc' | 'desc'): 'asc' | 'desc' {
    return direction === 'asc' ? 'desc' : 'asc'
  }

  /**
   * Cria configuração de paginação
   */
  static getPaginationInfo<T>(
    items: T[],
    currentPage: number,
    pageSize: number
  ): {
    paginatedItems: T[]
    totalPages: number
    startIndex: number
    endIndex: number
  } {
    const totalItems = items.length
    const totalPages = Math.ceil(totalItems / pageSize)
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = Math.min(startIndex + pageSize, totalItems)
    const paginatedItems = items.slice(startIndex, endIndex)

    return {
      paginatedItems,
      totalPages,
      startIndex,
      endIndex
    }
  }
}
