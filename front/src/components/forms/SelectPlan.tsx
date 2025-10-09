import React from 'react';
import { Plano } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface SelectPlanProps {
  plans: Plano[];
  value?: number;
  onChange: (planId: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
}

export const SelectPlan: React.FC<SelectPlanProps> = ({
  plans,
  value,
  onChange,
  placeholder = "Selecione um plano",
  disabled = false,
  className = '',
  required = false,
}) => {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      required={required}
      className={`
        w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm
        focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500
        disabled:bg-gray-100 disabled:cursor-not-allowed
        relative z-10
        ${className}
      `}
    >
      <option value="">{placeholder}</option>
      {plans.map((plan) => (
        <option key={plan.id} value={plan.id}>
          {plan.description} - {formatCurrency(plan.price)}
        </option>
      ))}
    </select>
  );
};