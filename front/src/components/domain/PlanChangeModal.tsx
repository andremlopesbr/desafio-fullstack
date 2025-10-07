import React, { useState } from 'react';
import { Plano, Contract } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { SelectPlan } from '../forms/SelectPlan';
import { PlanChangeSummary } from './PlanChangeSummary';
import { usePlanCredits } from '../../hooks/usePlanCredits';

interface PlanChangeModalProps {
  isOpen: boolean;
  currentPlan: Plano;
  currentContract: Contract;
  availablePlans: Plano[];
  loading: boolean;
  error?: string;
  userId: number;
  onClose: () => void;
  onConfirm: (newPlanId: number) => Promise<void>;
}

export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  currentPlan,
  currentContract,
  availablePlans,
  loading,
  error,
  userId,
  onClose,
  onConfirm,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();

  const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);
  const creditInfo = usePlanCredits(currentContract, selectedPlan, userId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleConfirm = async () => {
    if (!selectedPlanId) return;
    await onConfirm(selectedPlanId);
  };

  const handleClose = () => {
    setSelectedPlanId(undefined);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Trocar Plano">
      <div className="space-y-4">
        <div>
          <SelectPlan
            plans={availablePlans}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            placeholder="Selecione um novo plano"
          />
        </div>

        {selectedPlan && (
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

        {error && <ErrorMessage error={error} />}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlanId || loading}
            loading={loading}
          >
            {loading ? 'Alterando...' : 'Alterar Plano'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};