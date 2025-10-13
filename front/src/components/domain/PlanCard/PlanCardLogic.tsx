import { Plano } from '../../../types';

/**
 * Hook personalizado para lógica de apresentação do PlanCard
 */
export function usePlanCardLogic(plan: Plano, isCurrentPlan: boolean = false) {
  const getButtonText = (): string => {
    return isCurrentPlan ? 'Plano Ativo' : 'Assinar';
  };

  const getButtonVariant = (): 'primary' | 'secondary' => {
    return isCurrentPlan ? 'primary' : 'secondary';
  };

  const getButtonClassName = (): string => {
    return isCurrentPlan ? 'bg-green-600 hover:bg-green-600 disabled:bg-green-600' : '';
  };

  const getCardClassName = (className: string = ''): string => {
    const baseClasses = 'relative transform transition-transform hover:scale-105 duration-300 flex flex-col bg-white overflow-hidden';
    const currentPlanClasses = isCurrentPlan ? 'border-2 border-green-500' : '';
    return `${baseClasses} ${currentPlanClasses} ${className}`.trim();
  };

  const getAriaLabel = (buttonText: string): string => {
    return `${buttonText} - Plano ${plan.description}`;
  };

  return {
    getButtonText,
    getButtonVariant,
    getButtonClassName,
    getCardClassName,
    getAriaLabel,
  };
}