import { useState, useMemo } from 'react';

/**
 * Hook personalizado para gerenciar estado de tabelas com filtros e paginação
 * Segue princípio SRP - responsabilidade única: gerenciar estado da tabela
 */
export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterConfig {
  search: string;
  status: string;
}

export function useTableState<T extends Record<string, any>>(
  items: T[],
  initialSortField: string,
  searchFields: string[],
  statusFilter?: (item: T, status: string) => boolean,
  pageSize: number = 10
) {
  const [filters, setFilters] = useState<FilterConfig>({
    search: '',
    status: 'all',
  });

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: initialSortField,
    direction: 'asc',
  });

  const [currentPage, setCurrentPage] = useState(1);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = items;

    // Aplicar filtro de busca
    if (filters.search) {
      filtered = filtered.filter(item =>
        searchFields.some(field =>
          String(item[field]).toLowerCase().includes(filters.search.toLowerCase())
        )
      );
    }

    // Aplicar filtro de status
    if (filters.status && filters.status !== 'all' && statusFilter) {
      filtered = filtered.filter(item => statusFilter(item, filters.status));
    }

    // Aplicar ordenação
    return [...filtered].sort((a, b) => {
      const aValue = a[sortConfig.field];
      const bValue = b[sortConfig.field];

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;

      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, filters, sortConfig, searchFields, statusFilter]);

  const paginationInfo = useMemo(() => {
    const totalItems = filteredAndSortedItems.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);
    const paginatedItems = filteredAndSortedItems.slice(startIndex, endIndex);

    return {
      paginatedItems,
      totalPages,
      startIndex,
      endIndex,
    };
  }, [filteredAndSortedItems, currentPage, pageSize]);

  const handleSort = (field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field
        ? (prev.direction === 'asc' ? 'desc' : 'asc')
        : 'asc',
    }));
    setCurrentPage(1); // Reset para primeira página quando ordenar
  };

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search }));
    setCurrentPage(1); // Reset para primeira página quando filtrar
  };

  const handleStatusFilterChange = (status: string) => {
    setFilters(prev => ({ ...prev, status }));
    setCurrentPage(1); // Reset para primeira página quando filtrar
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    // Estado
    filters,
    sortConfig,
    currentPage,
    filteredAndSortedItems,
    ...paginationInfo,

    // Ações
    handleSort,
    handleSearchChange,
    handleStatusFilterChange,
    handlePageChange,

    // Computed
    hasActiveFilters: filters.search !== '' || filters.status !== 'all',
  };
}