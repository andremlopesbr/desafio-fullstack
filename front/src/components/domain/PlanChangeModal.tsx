import React from 'react';
import { Plano, Contract } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SelectPlan } from '../forms/SelectPlan';
import { PlanChangeSummary } from './PlanChangeSummary';
import { formatCurrency } from '../../utils/formatters';
import { usePlanChangeModal } from '../../hooks/usePlanChangeModal';

interface PlanChangeModalProps {
  isOpen: boolean;
  currentPlan: Plano;
  currentContract: Contract;
  availablePlans: Plano[];
  userId: number;
  onClose: () => void;
}

/**
 * Modal de mudança de plano refatorado seguindo SRP
 * Responsabilidade única: renderizar interface do modal
 */
export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  currentPlan,
  currentContract,
  availablePlans,
  userId,
  onClose,
}) => {
  const {
    selectedPlanId,
    selectedPlan,
    creditInfo,
    discountLoading,
    discountError,
    changeLoading,
    changeError,
    setSelectedPlanId,
    handleConfirm,
    modalTitle,
    isConfirmDisabled,
  } = usePlanChangeModal({
    currentPlan,
    currentContract,
    availablePlans,
    userId,
  });

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={modalTitle} size="xl">
      <div className="space-y-4">
        <PlanChangeModalContent
          availablePlans={availablePlans}
          selectedPlanId={selectedPlanId}
          selectedPlan={selectedPlan}
          setSelectedPlanId={setSelectedPlanId}
          currentPlan={currentPlan}
          creditInfo={creditInfo}
          discountLoading={discountLoading}
          discountError={discountError}
          formatCurrency={formatCurrency}
        />

        {changeError && <ErrorMessage error={changeError} />}

        <PlanChangeModalActions
          onClose={handleClose}
          onConfirm={handleConfirm}
          isConfirmDisabled={isConfirmDisabled}
          isLoading={changeLoading}
        />
      </div>
    </Modal>
  );
};

/**
 * Componente responsável pelo conteúdo do modal
 */
const PlanChangeModalContent: React.FC<{
  availablePlans: Plano[];
  selectedPlanId?: number;
  selectedPlan?: Plano;
  setSelectedPlanId: (id: number) => void;
  currentPlan: Plano;
  creditInfo: any;
  discountLoading: boolean;
  discountError?: string;
  formatCurrency: (value: number) => string;
}> = ({
  availablePlans,
  selectedPlanId,
  selectedPlan,
  setSelectedPlanId,
  currentPlan,
  creditInfo,
  discountLoading,
  discountError,
  formatCurrency,
}) => (
  <>
    <div>
      <SelectPlan
        plans={availablePlans}
        value={selectedPlanId}
        onChange={setSelectedPlanId}
        placeholder="Selecione um novo plano"
      />
    </div>

    {selectedPlan && (
      <>
        {discountLoading ? (
          <div className="flex justify-center items-center py-8">
            <LoadingSpinner />
            <span className="ml-2 text-gray-600">Calculando créditos...</span>
          </div>
        ) : discountError ? (
          <ErrorMessage error={`Erro ao calcular desconto: ${discountError || 'Erro desconhecido'}`} />
        ) : (
          <PlanChangeSummary
            currentPlan={currentPlan}
            newPlan={selectedPlan}
            creditInfo={creditInfo ? {
              databaseCredits: creditInfo.databaseCredits,
              proratedDiscount: creditInfo.proratedDiscount,
              finalPrice: creditInfo.finalPrice
            } : undefined}
            formatCurrency={formatCurrency}
          />
        )}
      </>
    )}
  </>
);

/**
 * Componente responsável pelas ações do modal
 */
const PlanChangeModalActions: React.FC<{
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isConfirmDisabled: boolean;
  isLoading: boolean;
}> = ({ onClose, onConfirm, isConfirmDisabled, isLoading }) => (
  <div className="flex justify-end space-x-3 pt-4">
    <Button variant="outline" onClick={onClose}>
      Cancelar
    </Button>
    <Button
      onClick={onConfirm}
      disabled={isConfirmDisabled}
      loading={isLoading}
    >
      {isLoading ? 'Alterando...' : 'Alterar Plano'}
    </Button>
  </div>
);