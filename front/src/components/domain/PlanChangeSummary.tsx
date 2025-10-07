import React from 'react';

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

      {/* Resumo da Troca com Descontos */}
      {creditInfo && (
        <div className="p-3 bg-yellow-50 rounded">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Resumo da Troca:
          </h3>
          <div className="space-y-1 text-sm">
            <p>
              Créditos em saldo:{" "}
              <span className="font-bold">
                {formatCurrency(creditInfo.databaseCredits)}
              </span>
            </p>
            <p>
              Desconto pro-rata do plano anterior:{" "}
              <span className="font-bold">
                {formatCurrency(creditInfo.proratedDiscount)}
              </span>
            </p>
            <p className="text-lg font-bold text-yellow-800 border-t pt-2 mt-2">
              Total a pagar: {formatCurrency(creditInfo.finalPrice)}
            </p>
            <span>
              À creditar:{" "}
              {formatCurrency(
                creditInfo.proratedDiscount +
                  creditInfo.databaseCredits -
                  newPlan.price
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};