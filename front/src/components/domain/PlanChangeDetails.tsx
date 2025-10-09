import React from "react";

interface PlanChangeDetailsProps {
  creditInfo?: {
    databaseCredits: number;
    proratedDiscount: number;
    proratedNew?: number;
    finalPrice: number;
  };
  formatCurrency: (value: number) => string;
  showToCredit: boolean;
}

export const PlanChangeDetails: React.FC<PlanChangeDetailsProps> = ({
  creditInfo,
  formatCurrency,
  showToCredit = false,
}) => {
  if (!creditInfo) return null;

  return (
    <div className="mb-4 p-3 bg-yellow-50 rounded">
      <h3 className="font-semibold text-yellow-800 mb-2">Descontos:</h3>
      <div className="space-y-1 text-sm">
        <p>
          Créditos em saldo:{" "}
          <span className="font-bold">
            {formatCurrency(creditInfo.databaseCredits)}
          </span>
        </p>
        <p>
          Desconto pro-rata (Plano Atual):{" "}
          <span className="font-bold">
            {formatCurrency(creditInfo.proratedDiscount)}
          </span>
        </p>
        <p className="text-lg font-bold text-yellow-800 border-t pt-2 mt-2">
          Total a pagar: {formatCurrency(creditInfo.finalPrice)}
        </p>
        {showToCredit &&
          creditInfo.finalPrice == 0 &&
          creditInfo.proratedDiscount > (creditInfo.proratedNew || 0) && (
            <span>
              À creditar:{" "}
              {formatCurrency(creditInfo.proratedDiscount - (creditInfo.proratedNew || 0))}
            </span>
          )}
      </div>
    </div>
  );
};
