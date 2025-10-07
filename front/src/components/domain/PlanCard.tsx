import React from 'react';
import { Plano } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Card } from '../ui';
import { Button } from '../ui';

interface PlanCardProps {
  plan: Plano;
  isCurrentPlan?: boolean;
  showPopularBadge?: boolean;
  actionButton?: React.ReactNode;
  onSelect?: (plan: Plano) => void;
  className?: string;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  isCurrentPlan = false,
  showPopularBadge = false,
  actionButton,
  onSelect,
  className = '',
}) => {
  const getButtonText = () => {
    return 'Contratar Plano';
  };

  const getButtonVariant = () => {
    return 'secondary' as const; // gray-800 background
  };

  return (
    <Card
      className={`
        relative transform transition-transform hover:scale-105 duration-300 flex flex-col
        ${isCurrentPlan ? 'bg-orange-50 border-orange-500' : 'bg-white'}
        ${className}
      `}
    >
      {/* Popular Badge */}
      {showPopularBadge && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
          Popular
        </div>
      )}

      {/* Header */}
      <div className="bg-orange-500 text-white p-5 rounded-t-lg">
        <h2 className="text-xl font-bold">Até {plan.numberOfClients} vistorias</h2>
        <p className="text-sm opacity-90">/clientes ativos</p>
      </div>

      {/* Content */}
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
            <p className="text-2xl font-bold text-gray-800">{plan.gigabytesStorage} GB</p>
          </div>
        </div>

        {/* Action Button */}
        {!isCurrentPlan && (
          <div className="mt-6">
            {actionButton ? (
              actionButton
            ) : onSelect ? (
              <Button
                onClick={() => onSelect(plan)}
                fullWidth
                variant={getButtonVariant()}
                aria-label={`${getButtonText()} - Plano ${plan.description}`}
              >
                {getButtonText()}
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </Card>
  );
};