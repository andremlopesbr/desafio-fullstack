import React from 'react';
import { Plano } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui';
import { Button } from '../ui';
import { usePlanCardLogic } from './PlanCard/PlanCardLogic';

interface PlanCardProps {
  plan: Plano;
  isCurrentPlan?: boolean;
  showPopularBadge?: boolean;
  actionButton?: React.ReactNode;
  onSelect?: (plan: Plano) => void;
  className?: string;
}

/**
 * Componente PlanCard refatorado seguindo SRP
 * Responsabilidade única: renderizar apresentação do plano
 */
export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  showPopularBadge = false,
  actionButton,
  onSelect,
  className = '',
}) => {
  const {
    getButtonText,
    getButtonVariant,
    getButtonClassName,
    getCardClassName,
    getAriaLabel,
  } = usePlanCardLogic(plan, isCurrentPlan);

  const buttonText = getButtonText();

  return (
    <Card
      className={getCardClassName(className)}
      rounded="xl"
      shadow="md"
    >
      {/* Popular Badge */}
      {showPopularBadge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
          Popular
        </div>
      )}

      {/* Header */}
      <PlanCardHeader plan={plan} />

      {/* Content */}
      <PlanCardContent plan={plan} />

      {/* Action Button */}
      <PlanCardActions
        actionButton={actionButton}
        onSelect={onSelect}
        plan={plan}
        isCurrentPlan={isCurrentPlan}
        buttonText={buttonText}
        buttonVariant={getButtonVariant()}
        buttonClassName={getButtonClassName()}
        ariaLabel={getAriaLabel(buttonText)}
      />
    </Card>
  );
};

/**
 * Componente responsável pelo cabeçalho do plano
 */
const PlanCardHeader: React.FC<{ plan: Plano }> = ({ plan }) => (
  <div className="bg-orange-500 text-white p-5 rounded-t-lg">
    <h2 className="text-xl font-bold">Até {plan.numberOfClients} vistorias</h2>
    <p className="text-sm opacity-90">/clientes ativos</p>
  </div>
);

/**
 * Componente responsável pelo conteúdo do plano
 */
const PlanCardContent: React.FC<{ plan: Plano }> = ({ plan }) => (
  <div className="p-6 flex-grow flex flex-col justify-between">
    <div>
      {/* Price */}
      <div className="text-gray-600 mb-4">
        <span className="text-sm">Preço:</span>
        <p className="text-3xl font-bold text-gray-800">
          {formatCurrency(plan.price)}
          <span className="text-lg font-normal"> /mês</span>
        </p>
      </div>

      {/* Storage */}
      <div className="text-gray-600">
        <span className="text-sm">Armazenamento:</span>
        <p className="text-3xl font-bold text-gray-800">{plan.gigabytesStorage} GB</p>
      </div>
    </div>
  </div>
);

/**
 * Componente responsável pelas ações do plano
 */
const PlanCardActions: React.FC<{
  actionButton?: React.ReactNode;
  onSelect?: (plan: Plano) => void;
  plan: Plano;
  isCurrentPlan: boolean;
  buttonText: string;
  buttonVariant: 'primary' | 'secondary';
  buttonClassName: string;
  ariaLabel: string;
}> = ({
  actionButton,
  onSelect,
  plan,
  isCurrentPlan,
  buttonText,
  buttonVariant,
  buttonClassName,
  ariaLabel,
}) => (
  <div className="mt-6">
    {actionButton ? (
      actionButton
    ) : onSelect ? (
      <Button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan}
        fullWidth
        variant={buttonVariant}
        className={buttonClassName}
        aria-label={ariaLabel}
      >
        {buttonText}
      </Button>
    ) : null}
  </div>
);