import React, { useState, useMemo } from "react";
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
  discountDetails: {
    prorrata: number;
    balanceCredit: number;
    totalDiscount: number;
  };
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
          aValue = a.discountDetails.totalDiscount;
          bValue = b.discountDetails.totalDiscount;
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

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === "asc" ? (
      <HiChevronUp className="inline ml-1" />
    ) : (
      <HiChevronDown className="inline ml-1" />
    );
  };

  return (
    <Card>
      <div className="space-y-4">
        {/* Search and Filter Controls */}
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

        <div className="overflow-x-auto shadow-sm rounded-lg">
          <Table striped hoverable className="border-collapse">
            <TableHead className="bg-gray-50">
              <TableRow>
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
            <TableBody>
              {paginatedItems.map(({ contract, payments, discountDetails }) => (
                <TableRow key={contract.id}>
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
                    {(() => {
                      // Buscar o pagamento mais recente para este contrato
                      const latestPayment =
                        payments.length > 0
                          ? payments[payments.length - 1]
                          : null;

                      if (
                        latestPayment &&
                        latestPayment.discount_applied &&
                        latestPayment.discount_applied > 0
                      ) {
                        const proratedOldInReais =
                          latestPayment.prorated_old || 0; // Já em reais
                        const proratedNewInReais =
                          latestPayment.prorated_new || 0; // Já em reais
                        const appliedCreditsInReais =
                          latestPayment.applied_credits || 0; // Já em reais

                        // Determinar se é downgrade baseado na diferença: prorated_new - prorated_old
                        const planDifference =
                          proratedNewInReais - proratedOldInReais;

                        return (
                          <div className="space-y-1 text-sm">
                            {appliedCreditsInReais > 0 && (
                              <div className="text-green-600">
                                Créditos:{" "}
                                {formatCurrency(appliedCreditsInReais)}
                              </div>
                            )}
                            {planDifference <= 0 ? (
                              // DOWNGRADE: prorated_old > prorated_new
                              <>
                                <div className="text-blue-600">
                                  Pro-rata: {formatCurrency(Math.min(proratedNewInReais, proratedOldInReais))}{" "}
                                  [de {formatCurrency(proratedOldInReais)}]
                                </div>
                                <div className="font-semibold text-purple-700 border-t border-gray-200 pt-1 mt-1">
                                  À creditar: {formatCurrency(Math.max(0, proratedOldInReais - proratedNewInReais))}
                                </div>
                              </>
                            ) : (
                              // UPGRADE: prorated_new > prorated_old
                              <div className="text-blue-600">
                                Pro-rata: {formatCurrency(proratedOldInReais)}
                              </div>
                            )}
                          </div>
                        );
                      } else if (discountDetails.totalDiscount > 0) {
                        // Fallback para o cálculo antigo se não houver dados no pagamento
                        return (
                          <div className="space-y-1 text-sm">
                            {discountDetails.balanceCredit > 0 && (
                              <div className="text-green-600">
                                Créditos:{" "}
                                {formatCurrency(discountDetails.balanceCredit)}
                              </div>
                            )}
                            {discountDetails.prorrata > 0 && (
                              <div className="text-blue-600">
                                Pro-rata:{" "}
                                {formatCurrency(discountDetails.prorrata)}
                              </div>
                            )}
                            <div className="font-semibold text-purple-700 border-t border-gray-200 pt-1 mt-1">
                              Total:{" "}
                              {formatCurrency(discountDetails.totalDiscount)}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <span className="text-gray-400 text-sm">
                            Nenhum desconto
                          </span>
                        );
                      }
                    })()}
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
                    {(() => {
                      // Filtrar para mostrar apenas um pagamento por data (o mais recente)
                      const uniquePaymentsMap = new Map();

                      // Ordenar por data decrescente (mais recentes primeiro)
                      const sortedPayments = [...payments].sort((a, b) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                      );

                      // Manter apenas um pagamento por data (o mais recente)
                      sortedPayments.forEach((payment) => {
                        const dateKey = payment.payment_date.split('T')[0]; // YYYY-MM-DD
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
                    })()}
                  </TableCell>
                </TableRow>
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
