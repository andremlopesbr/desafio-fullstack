import React, { useState, useMemo } from "react";
import { Table, TableBody, Pagination, Card } from "flowbite-react";
import { HistoryTableControls } from "./HistoryTable/HistoryTableControls";
import { HistoryTableHeader } from "./HistoryTable/HistoryTableHeader"; // Supondo que você criou este arquivo
import { HistoryTableRow } from "./HistoryTable/HistoryTableRow"; // Supondo que você criou este arquivo
import { HistoryItem } from "../../types";

interface HistoryTableProps {
  historyItems: HistoryItem[];
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}

type SortField = "order" | "invoice" | "plan" | "price" | "discount" | "status" | "payments";
type SortDirection = "asc" | "desc";

export const HistoryTable: React.FC<HistoryTableProps> = ({
  historyItems,
  formatCurrency,
  formatDate,
}) => {
  console.log('🚀 DEBUG HistoryTable - Componente renderizado');
  console.log('Total de historyItems recebidos:', historyItems.length);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("plan");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredAndSortedItems = useMemo(() => {
    console.log('🔍 DEBUG HistoryTable - Iniciando filtragem');
    console.log('Total de itens recebidos:', historyItems.length);
    console.log('Filtros aplicados:', { searchTerm, statusFilter, sortField, sortDirection });

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

      if (!matchesSearch || !matchesStatus) {
        console.log(`🔍 DEBUG HistoryTable - Item filtrado: Contrato ${item.contract.id} (${item.contract.plan.description})`);
      }

      return matchesSearch && matchesStatus;
    });

    console.log('🔍 DEBUG HistoryTable - Após filtragem:', filtered.length, 'itens restantes');

    // Primeiro ordena por status ativo (ativos primeiro), depois aplica a ordenação selecionada
    filtered.sort((a, b) => {
      // Prioriza contratos ativos no topo
      const aIsActive = a.contract.status === "active";
      const bIsActive = b.contract.status === "active";

      if (aIsActive && !bIsActive) return -1;
      if (!aIsActive && bIsActive) return 1;

      // Se ambos são ativos ou ambos não são, aplica ordenação normal
      let aValue: string | number = 0, bValue: string | number = 0;

      // Calcular valores para ordenação fora do switch para evitar problemas de escopo
      if (sortField === "order") {
        // Para ordenação por order, vamos usar o índice no array original
        const originalIndexA = historyItems.findIndex(item => item.contract.id === a.contract.id);
        const originalIndexB = historyItems.findIndex(item => item.contract.id === b.contract.id);
        aValue = originalIndexA;
        bValue = originalIndexB;
      } else if (sortField === "invoice") {
        // Ordenar por ID do contrato como proxy para invoice
        aValue = a.contract.id;
        bValue = b.contract.id;
      } else {
        // Outros campos de ordenação
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
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [historyItems, searchTerm, statusFilter, sortField, sortDirection]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    console.log('🔍 DEBUG HistoryTable - Aplicando paginação');
    console.log(`Página ${currentPage}, mostrando itens ${start + 1}-${Math.min(end, filteredAndSortedItems.length)} de ${filteredAndSortedItems.length}`);

    const result = filteredAndSortedItems.slice(start, start + pageSize);
    console.log('🔍 DEBUG HistoryTable - Itens na página atual:', result.length);
    return result;
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

  console.log('✅ DEBUG HistoryTable - Renderizando componente');
  console.log(`Estado atual: página ${currentPage}, termo de busca: "${searchTerm}", filtro de status: "${statusFilter}"`);
  console.log(`Itens paginados para exibir: ${paginatedItems.length}`);

  return (
    <Card>
      <div className="space-y-4">
        {/* Search and Filter Controls*/}
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
              {/* Table Rows */}
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