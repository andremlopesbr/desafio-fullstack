import React, { useMemo } from "react";
import {
  Table,
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
  Button,
  TextInput,
  Dropdown,
  DropdownItem,
  Pagination,
  Card,
} from "flowbite-react";
import { HiChevronUp, HiChevronDown, HiFilter } from "react-icons/hi";

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

interface HistoryItem {
  contract: Contract;
  payments: Payment[];
}

interface HistoryTableProps {
  historyItems: HistoryItem[];
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}


/**
 * Utilitário para filtrar e ordenar itens de histórico
 * Implementa Single Responsibility Principle
 */
function useFilteredHistoryItems(
  historyItems: HistoryItem[],
  searchTerm: string,
  statusFilter: string,
  sortField: string,
  sortDirection: string
) {
  return useMemo(() => {
    // Primeiro filtra os itens
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

    // Depois ordena os itens filtrados
    return filtered.sort((a, b) => {
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
  }, [historyItems, searchTerm, statusFilter, sortField, sortDirection]);
}

/**
 * Componente para controles de busca e filtro
 * Segue princípio de responsabilidade única
 */
function HistoryTableControls({
  searchTerm,
  setSearchTerm,
  setStatusFilter
}: {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  setStatusFilter: (status: string) => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex-1">
        <TextInput
          placeholder="Buscar por plano ou status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <Dropdown
        label={
          <div className="flex items-center">
            <HiFilter className="mr-2" />
            Filtrar por Status
          </div>
        }
        color="light"
      >
        <DropdownItem onClick={() => setStatusFilter("all")}>
          Todos
        </DropdownItem>
        <DropdownItem onClick={() => setStatusFilter("active")}>
          Ativo
        </DropdownItem>
        <DropdownItem onClick={() => setStatusFilter("cancelled")}>
          Cancelado
        </DropdownItem>
        <DropdownItem onClick={() => setStatusFilter("other")}>
          Outros
        </DropdownItem>
      </Dropdown>
    </div>
  );
}

/**
 * Componente para cabeçalho da tabela com ordenação
 * Componente reutilizável e focado em uma responsabilidade
 */
function HistoryTableHeader({
  sortField,
  sortDirection,
  onSort
}: {
  sortField: string;
  sortDirection: string;
  onSort: (field: string) => void;
}) {
  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <HiChevronUp className="inline ml-1" />
    ) : (
      <HiChevronDown className="inline ml-1" />
    );
  };

  const handleSort = (field: string) => {
    onSort(field);
  };

  return (
    <TableHead className="bg-gray-50">
      <TableRow>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          ID
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => handleSort("plan")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Plano {renderSortIcon("plan")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => handleSort("price")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Valor {renderSortIcon("price")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => handleSort("discount")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Descontos {renderSortIcon("discount")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => handleSort("status")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Status {renderSortIcon("status")}
          </Button>
        </TableHeadCell>
        <TableHeadCell className="font-semibold text-gray-700 border-b-2 border-gray-200">
          <Button
            size="sm"
            color="light"
            onClick={() => handleSort("payments")}
            className="p-0 hover:bg-transparent font-semibold text-gray-700"
          >
            Pagamentos {renderSortIcon("payments")}
          </Button>
        </TableHeadCell>
      </TableRow>
    </TableHead>
  );
}

/**
 * Componente para renderizar linha da tabela
 * Responsabilidade única e reutilizável
 */
function HistoryTableRow({
  item,
  index,
  currentPage,
  pageSize,
  formatCurrency,
  formatDate
}: {
  item: HistoryItem;
  index: number;
  currentPage: number;
  pageSize: number;
  formatCurrency: (value: number) => string;
  formatDate: (dateString: string) => string;
}) {
  const { contract, payments } = item;

  // Renderiza descontos de forma otimizada
  const renderDiscounts = () => {
    const sortedPayments = [...payments].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const latestPayment = sortedPayments.length > 0 ? sortedPayments[sortedPayments.length - 1] : null;

    if (!latestPayment) {
      return <span className="text-gray-400 text-sm">Nenhum desconto</span>;
    }

    const { prorated_old = 0, prorated_new = 0, applied_credits = 0, discount_applied = 0 } = latestPayment;
    const discountLines = [];

    if (applied_credits > 0) {
      discountLines.push(`Créditos: ${formatCurrency(applied_credits)}`);
    }

    if (prorated_old > 0) {
      if (prorated_old > prorated_new) { // Downgrade
        const prorataUsed = Math.min(prorated_old, prorated_new);
        discountLines.push(`Pro-rata: ${formatCurrency(prorataUsed)} [de ${formatCurrency(prorated_old)}]`);
        const creditGenerated = prorated_old - prorated_new;
        if (creditGenerated > 0) {
          discountLines.push(`À creditar: ${formatCurrency(creditGenerated)}`);
        }
      } else { // Upgrade
        discountLines.push(`Pro-rata: ${formatCurrency(prorated_old)} [de ${formatCurrency(prorated_old)}]`);
      }
    }

    if (discount_applied > 0) {
      discountLines.push(`Total de Desconto: ${formatCurrency(discount_applied)}`);
    }

    if (discountLines.length === 0) {
      return <span className="text-gray-400 text-sm">Nenhum desconto</span>;
    }

    return (
      <div className="space-y-1 text-sm">
        {discountLines.map((line, index) => (
          <div key={index} className={line.includes('Total') ? 'font-semibold text-gray-700 border-t border-gray-200 pt-1 mt-1' : (line.includes('Créditos') ? 'text-green-600' : 'text-blue-600')}>
            {line}
          </div>
        ))}
      </div>
    );
  };

  // Renderiza pagamentos únicos por data
  const renderPayments = () => {
    const uniquePaymentsMap = new Map();
    const sortedPayments = [...payments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    sortedPayments.forEach((payment) => {
      const dateKey = payment.payment_date.split('T')[0];
      if (!uniquePaymentsMap.has(dateKey)) {
        uniquePaymentsMap.set(dateKey, payment);
      }
    });

    const uniquePayments = Array.from(uniquePaymentsMap.values());

    return uniquePayments.length > 0 ? (
      <div className="space-y-2">
        {uniquePayments.map((payment) => (
          <div
            key={payment.id}
            className="bg-gray-50 p-2 rounded text-sm"
          >
            <div className="font-medium text-gray-900">
              {formatCurrency(payment.amount)}
            </div>
            <div className="text-gray-600">
              {formatDate(payment.payment_date)}
            </div>
            <span
              className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                payment.status === "paid"
                  ? "bg-green-100 text-green-800"
                  : payment.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {payment.status === "paid"
                ? "Pago"
                : payment.status === "pending"
                ? "Pendente"
                : payment.status}
            </span>
          </div>
        ))}
      </div>
    ) : (
      <span className="text-gray-400 text-sm">
        Nenhum pagamento
      </span>
    );
  };

  return (
    <TableRow>
      <TableCell className="bg-white font-medium text-gray-500">
        {(currentPage - 1) * pageSize + index + 1}
      </TableCell>
      <TableCell className="bg-white">
        <div className="font-medium text-gray-900">
          {contract.plan.description}
        </div>
        <div className="text-sm text-gray-500">
          {contract.plan.numberOfClients} vistorias,{" "}
          {contract.plan.gigabytesStorage} GB
        </div>
      </TableCell>
      <TableCell className="bg-white">
        <div className="text-lg font-medium text-green-600">
          {formatCurrency(contract.plan.price)}
        </div>
        <div className="text-sm text-gray-500">por mês</div>
      </TableCell>
      <TableCell className="bg-white">
        {renderDiscounts()}
      </TableCell>
      <TableCell className="bg-white">
        <span
          className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            contract.status === "active"
              ? "bg-green-100 text-green-800"
              : contract.status === "cancelled"
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {contract.status === "active"
            ? "Ativo"
            : contract.status === "cancelled"
            ? "Cancelado"
            : contract.status}
        </span>
        <div className="text-sm text-gray-500 mt-1">
          Contratado:{" "}
          {contract.start_date
            ? formatDate(contract.start_date)
            : "N/A"}
        </div>
      </TableCell>
      <TableCell className="bg-white">
        {renderPayments()}
      </TableCell>
    </TableRow>
  );
}

/**
 * Tabela de histórico otimizada com melhor separação de responsabilidades
 * Implementa princípios SOLID: SRP, OCP, DIP
 */
export const HistoryTableOptimized: React.FC<HistoryTableProps> = ({
  historyItems,
  formatCurrency,
  formatDate,
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortField, setSortField] = React.useState<'plan' | 'price' | 'discount' | 'status' | 'payments'>("plan");
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>("asc");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [currentPage, setCurrentPage] = React.useState(1);

  const pageSize = 10;

  const tableState = {
    searchTerm,
    setSearchTerm,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    statusFilter,
    setStatusFilter,
    currentPage,
    setCurrentPage,
    pageSize
  };
  const filteredItems = useFilteredHistoryItems(
    historyItems,
    tableState.searchTerm,
    tableState.statusFilter,
    tableState.sortField,
    tableState.sortDirection
  );

  const paginatedItems = useMemo(() => {
    const start = (tableState.currentPage - 1) * tableState.pageSize;
    return filteredItems.slice(start, start + tableState.pageSize);
  }, [filteredItems, tableState.currentPage, tableState.pageSize]);

  const totalPages = Math.ceil(filteredItems.length / tableState.pageSize);

  const handleSort = (field: string) => {
    if (tableState.sortField === field) {
      tableState.setSortDirection(tableState.sortDirection === "asc" ? "desc" : "asc");
    } else {
      tableState.setSortField(field as any);
      tableState.setSortDirection("asc");
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <HistoryTableControls
          searchTerm={tableState.searchTerm}
          setSearchTerm={tableState.setSearchTerm}
          setStatusFilter={tableState.setStatusFilter}
        />

        <div className="overflow-x-auto shadow-sm rounded-lg">
          <Table striped hoverable className="border-collapse">
            <HistoryTableHeader
              sortField={tableState.sortField}
              sortDirection={tableState.sortDirection}
              onSort={handleSort}
            />
            <TableBody>
              {paginatedItems.map((item, index) => (
                <HistoryTableRow
                  key={item.contract.id}
                  item={item}
                  index={index}
                  currentPage={tableState.currentPage}
                  pageSize={tableState.pageSize}
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
              currentPage={tableState.currentPage}
              totalPages={totalPages}
              onPageChange={tableState.setCurrentPage}
              showIcons
            />
          </div>
        )}

        <div className="text-sm text-gray-500">
          Mostrando {paginatedItems.length} de {filteredItems.length}{" "}
          resultados
        </div>
      </div>
    </Card>
  );
};

export default HistoryTableOptimized;