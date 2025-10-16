import React from "react";
import { TextInput, Dropdown, DropdownItem } from "flowbite-react";
import { HiFilter } from "react-icons/hi";

interface HistoryTableControlsProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export const HistoryTableControls: React.FC<HistoryTableControlsProps> = ({
  searchTerm,
  onSearchChange,
  onStatusFilterChange,
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="flex-1">
        <TextInput
          placeholder="Buscar por plano"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
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
        <DropdownItem onClick={() => onStatusFilterChange("all")}>Todos</DropdownItem>
        <DropdownItem onClick={() => onStatusFilterChange("active")}>Ativo</DropdownItem>
        <DropdownItem onClick={() => onStatusFilterChange("cancelled")}>Cancelado</DropdownItem>
        <DropdownItem onClick={() => onStatusFilterChange("other")}>Outros</DropdownItem>
      </Dropdown>
    </div>
  );
};