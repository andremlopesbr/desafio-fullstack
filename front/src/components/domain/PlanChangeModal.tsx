import React, { useState } from 'react';
import { Plano } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { ErrorMessage } from '../ui/ErrorMessage';
import { SelectPlan } from '../forms/SelectPlan';

interface PlanChangeModalProps {
  isOpen: boolean;
  currentPlan: Plano;
  availablePlans: Plano[];
  loading: boolean;
  error?: string;
  onClose: () => void;
  onConfirm: (newPlanId: number) => Promise<void>;
}

export const PlanChangeModal: React.FC<PlanChangeModalProps> = ({
  isOpen,
  currentPlan,
  availablePlans,
  loading,
  error,
  onClose,
  onConfirm,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();

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
          <p className="text-gray-600 mb-4">
            Seu plano atual: <span className="font-semibold">{currentPlan.description}</span>
          </p>

          <SelectPlan
            plans={availablePlans}
            value={selectedPlanId}
            onChange={setSelectedPlanId}
            placeholder="Selecione um novo plano"
          />
        </div>

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