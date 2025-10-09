import React, { useState } from 'react';
import { Plano, Contract } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { SelectPlan } from '../forms/SelectPlan';
import { PlanChangeSummary } from './PlanChangeSummary';
import { usePlanDiscount } from '../../hooks/usePlanDiscount';
import { formatCurrency } from '../../utils/formatters';

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
  const { data: creditInfo, loading: discountLoading, error: discountError } = usePlanDiscount(currentContract, selectedPlan, userId);

  const getModalTitle = () => {
    if (!selectedPlan) return 'Trocar Plano';
    const isUpgrade = selectedPlan.price > currentPlan.price;
    const isDowngrade = selectedPlan.price < currentPlan.price;
    if (isUpgrade) return 'Upgrade de Plano';
    if (isDowngrade) return 'Downgrade de Plano';
    return 'Trocar Plano';
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
    <Modal isOpen={isOpen} onClose={handleClose} title={getModalTitle()} size="xl">
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
          <>
            {discountLoading ? (
              <div className="flex justify-center items-center py-8">
                <LoadingSpinner />
                <span className="ml-2 text-gray-600">Calculando créditos...</span>
              </div>
            ) : discountError ? (
              <ErrorMessage error={`Erro ao calcular desconto: ${discountError}`} />
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

        {error && <ErrorMessage error={error} />}

        <div className="flex justify-end space-x-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedPlanId || loading || discountLoading}
            loading={loading}
          >
            {loading ? 'Alterando...' : 'Alterar Plano'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};