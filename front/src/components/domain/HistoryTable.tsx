import React, { useState, useMemo } from "react";
import { Table, TableBody, Pagination, Card } from "flowbite-react";
import { HistoryTableControls } from "./HistoryTable/HistoryTableControls";
import { HistoryTableHeader } from "./HistoryTable/HistoryTableHeader"; // Supondo que você criou este arquivo
import { HistoryTableRow } from "./HistoryTable/HistoryTableRow"; // Supondo que você criou este arquivo

interface Contract {
  id: number;
  user_id: number;
  plan_id: number;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
  plan: {
    id: number;
    description: string;
    numberOfClients: number;
    gigabytesStorage: number;
    price: number;
    active: boolean;
  };
}

interface Payment {
  id: number;
  contract_id: number;
  amount: number;
  payment_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  discount_applied?: number;
  prorated_old?: number;
  prorated_new?: number;
  applied_credits?: number;
}

interface HistoryItem {
  contract: Contract;
  payments: Payment[];
}

interface HistoryTableProps {
  historyItems: HistoryItem[];
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}

type SortField = "plan" | "price" | "discount" | "status" | "payments";
type SortDirection = "asc" | "desc";

export const HistoryTable: React.FC<HistoryTableProps> = ({
  historyItems,
  formatCurrency,
  formatDate,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("plan");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredAndSortedItems = useMemo(() => {
    const filtered = historyItems.filter((item) => {
      const matchesSearch =
        item.contract.plan.description
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        item.contract.status?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "other"
          ? !["active", "cancelled"].includes(item.contract.status || "")
          : item.contract.status === statusFilter);
      return matchesSearch && matchesStatus;
    });

    // Primeiro ordena por status ativo (ativos primeiro), depois aplica a ordenação selecionada
    filtered.sort((a, b) => {
      // Prioriza contratos ativos no topo
      const aIsActive = a.contract.status === "active";
      const bIsActive = b.contract.status === "active";

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Se ambos são ativos ou ambos não são, aplica ordenação normal
      let aValue: string | number, bValue: string | number;
      switch (sortField) {
        case "plan":
          aValue = a.contract.plan.description;
          bValue = b.contract.plan.description;
          break;
        case "price":
          aValue = a.contract.plan.price;
          bValue = b.contract.plan.price;
          break;
        case "discount":
          aValue = a.payments[a.payments.length - 1]?.discount_applied || 0;
          bValue = b.payments[b.payments.length - 1]?.discount_applied || 0;
          break;
        case "status":
          aValue = a.contract.status || "";
          bValue = b.contract.status || "";
          break;
        case "payments":
          aValue = a.payments.length;
          bValue = b.payments.length;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [historyItems, searchTerm, statusFilter, sortField, sortDirection]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Search and Filter Controls - SRP: apenas controles */}
        <HistoryTableControls
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />

        <div className="overflow-x-auto shadow-sm rounded-lg">
          <Table striped hoverable className="border-collapse">
            {/* Table Header - SRP: apenas cabeçalhos ordenáveis */}
            <HistoryTableHeader
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
            />
            <TableBody>
              {/* Table Rows - SRP: cada linha individual */}
              {paginatedItems.map((item, index) => (
                <HistoryTableRow
                  key={item.contract.id}
                  item={item}
                  index={index}
                  currentPage={currentPage}
                  pageSize={pageSize}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
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
          Mostrando {paginatedItems.length} de {filteredAndSortedItems.length}{" "}
          resultados
        </div>
      </div>
    </Card>
  );
};