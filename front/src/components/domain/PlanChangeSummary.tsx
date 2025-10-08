import React from "react";
import { PlanChangeDetails } from "./PlanChangeDetails";

interface PlanChangeSummaryProps {
  currentPlan: {
    id: number;
    description: string;
    price: number;
  };
  newPlan: {
    id: number;
    description: string;
    price: number;
  };
  creditInfo?: {
    databaseCredits: number;
    proratedDiscount: number;
    finalPrice: number;
  };
  formatCurrency: (value: number) => string;
}

export const PlanChangeSummary: React.FC<PlanChangeSummaryProps> = ({
  currentPlan,
  newPlan,
  creditInfo,
  formatCurrency,
}) => {
  return (
    <div className="space-y-4">
      {/* Plano Atual */}
      <div className="p-3 bg-blue-50 rounded">
        <h3 className="font-semibold text-blue-800">Plano Atual</h3>
        <p className="text-blue-700">
          {currentPlan.description} - {formatCurrency(currentPlan.price)}/mês
        </p>
      </div>

      {/* Novo Plano */}
      <div className="p-3 bg-green-50 rounded">
        <h3 className="font-semibold text-green-800">Novo Plano</h3>
        <p className="text-green-700">
          {newPlan.description} - {formatCurrency(newPlan.price)}/mês
        </p>
      </div>

      {/* Descontos*/}
      {creditInfo && (
        <PlanChangeDetails
          newPlan={newPlan}
          creditInfo={creditInfo}
          formatCurrency={formatCurrency}
          showToCredit={false}
        />
      )}
    </div>
  );
};
