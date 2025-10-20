import React, { useState, useMemo } from 'react'
import { Table, TableBody, Pagination, Card } from 'flowbite-react'
import { HistoryTableControls } from './HistoryTable/HistoryTableControls'
import { HistoryTableHeader } from './HistoryTable/HistoryTableHeader'
import { HistoryTableRow } from './HistoryTable/HistoryTableRow'
import { HistoryItem } from '../../types'

interface HistoryTableProps {
  historyItems: HistoryItem[]
  formatCurrency: (value: number) => string
  formatDate: (dateString: string) => string
  isLoadingPayments?: boolean
}

type SortField = 'order' | 'invoice' | 'status'
type SortDirection = 'asc' | 'desc'

export const HistoryTable: React.FC<HistoryTableProps> = ({
  historyItems,
  formatCurrency,
  formatDate,
  isLoadingPayments = false
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortField, setSortField] = useState<SortField>('invoice')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const filteredAndSortedItems = useMemo(() => {
    const filtered = historyItems.filter(item => {
      const matchesSearch =
        item.contract.plan.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.contract.status?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'other'
          ? !['active', 'cancelled'].includes(item.contract.status || '')
          : item.contract.status === statusFilter)

      return matchesSearch && matchesStatus
    })

    filtered.sort((a, b) => {
      let aValue: string | number = 0,
        bValue: string | number = 0

      if (sortField === 'order') {
        aValue = filtered.indexOf(a)
        bValue = filtered.indexOf(b)
      } else if (sortField === 'invoice') {
        aValue = a.contract.id
        bValue = b.contract.id
      } else if (sortField === 'status') {
        aValue = a.contract.status || ''
        bValue = b.contract.status || ''
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return filtered
  }, [historyItems, searchTerm, statusFilter, sortField, sortDirection])

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const result = filteredAndSortedItems.slice(start, start + pageSize)
    return result
  }, [filteredAndSortedItems, currentPage])

  const totalPages = Math.ceil(filteredAndSortedItems.length / pageSize)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  return (
    <Card>
      <div className="space-y-4">
        <HistoryTableControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <div className="overflow-x-auto shadow-sm rounded-lg">
          <Table striped hoverable className="border-collapse bg-white">
            <HistoryTableHeader
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableBody>
              {paginatedItems.map((item, index) => (
                <HistoryTableRow
                  key={item.contract.id}
                  item={item}
                  index={index}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  isLoadingPayments={isLoadingPayments}
                />
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              showIcons
            />
          </div>
        )}

        <div className="text-sm text-gray-500">
          Mostrando {paginatedItems.length} de {filteredAndSortedItems.length} resultados
        </div>
      </div>
    </Card>
  )
}
