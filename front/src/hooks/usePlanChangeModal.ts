import { useState } from 'react';
import { Plano, Contract } from '../types';
import { useChangePlan } from './useChangePlan';
import { usePlanDiscount } from './usePlanDiscount';

interface UsePlanChangeModalProps {
  currentPlan: Plano;
  currentContract: Contract;
  availablePlans: Plano[];
  userId: number;
}

/**
 * Hook personalizado para lógica de mudança de plano
 * Segue princípio SRP - responsabilidade única: gerenciar estado e ações do modal
 */
export function usePlanChangeModal({
  currentPlan,
  currentContract,
  availablePlans,
  userId,
}: UsePlanChangeModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<number | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const selectedPlan = availablePlans.find(p => p.id === selectedPlanId);
  const { data: creditInfo, loading: discountLoading, error: discountError } = usePlanDiscount(
    currentContract,
    selectedPlan,
    userId
  );

  const { changePlan, loading: changeLoading, error: changeError } = useChangePlan();

  const getModalTitle = (): string => {
    if (!selectedPlan) return 'Trocar Plano';
    const isUpgrade = selectedPlan.price > currentPlan.price;
    const isDowngrade = selectedPlan.price < currentPlan.price;
    if (isUpgrade) return 'Upgrade de Plano';
    if (isDowngrade) return 'Downgrade de Plano';
    return 'Trocar Plano';
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setSelectedPlanId(undefined);
    setIsModalOpen(false);
  };

  const handleConfirm = async (): Promise<void> => {
    if (!selectedPlanId) return;

    const success = await changePlan(currentContract.id, selectedPlanId);
    if (success) {
      closeModal();
    }
  };

  const isConfirmDisabled = (): boolean => {
    return !selectedPlanId || changeLoading || discountLoading;
  };

  return {
    // Estado
    selectedPlanId,
    selectedPlan,
    isModalOpen,
    creditInfo,
    discountLoading,
    discountError,
    changeLoading,
    changeError,

    // Ações
    setSelectedPlanId,
    openModal,
    closeModal,
    handleConfirm,

    // Computed
    modalTitle: getModalTitle(),
    isConfirmDisabled: isConfirmDisabled(),
  };
}