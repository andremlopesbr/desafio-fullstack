import React from 'react';
import { TableHead, TableRow, TableHeadCell, Button } from "flowbite-react";
import { HiChevronUp, HiChevronDown } from "react-icons/hi";

type SortField = "plan" | "price" | "discount" | "status" | "payments";
type SortDirection = "asc" | "desc";

interface HistoryTableHeaderProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
}

/**
 * Componente responsável apenas pelos cabeçalhos da tabela
 * Segue princípio SRP - única responsabilidade: cabeçalhos ordenáveis
 */
export const HistoryTableHeader: React.FC<HistoryTableHeaderProps> = ({
  sortField,
  sortDirection,
  onSort
}) => {
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <HiChevronUp className="inline ml-1" />
    ) : (
      <HiChevronDown className="inline ml-1" />
    );
  };

  return (
    <TableHead className="bg-gray-50">
      <TableRow>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          #
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          Fat
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => onSort("plan")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Plano {renderSortIcon("plan")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => onSort("price")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Valor {renderSortIcon("price")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => onSort("discount")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Descontos {renderSortIcon("discount")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => onSort("status")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Status {renderSortIcon("status")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => onSort("payments")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Pagamentos {renderSortIcon("payments")}
          </Button>
        </TableHeadCell>
      </TableRow>
    </TableHead>
  );
};