/**
 * Formata valores monetários no padrão brasileiro (R$ XX,XX)
 * @param value - Valor em reais no padrão de numeros americano (não em centavos)
 * @returns String formatada como R$ XX,XX
 *
 * Exemplo:
 * formatCurrency(9.90) -> "R$ 9,90"
 * formatCurrency(87.00) -> "R$ 87,00"
 */
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: string | Date): string => {
   const dateObj = typeof date === 'string' ? new Date(date) : date;
   return dateObj.toLocaleString('pt-BR');
 };

/**
 * Converte valor de reais para centavos para envio à API
 * @param valueInReais - Valor em reais
 * @returns Valor em centavos (integer)
 *
 * FLUXO: Frontend (reais) → API (centavos)
 * Exemplo: 9.90 → 990, 87.00 → 8700
 */
export const convertToCents = (valueInReais: number): number => {
  // Primeiro converter para número caso seja string
  const numericValue = typeof valueInReais === 'string' ? parseFloat(valueInReais) : valueInReais;
  return Math.round(numericValue * 100);
};

/**
 * Converte valor de centavos para reais
 * @param valueInCents - Valor em centavos
 * @returns Valor em reais (decimal)
 *
 * FLUXO: API (centavos) → Frontend (reais)
 * Exemplo: 990 → 9.90
 */
export const convertToReais = (valueInCents: number): number => {
  return valueInCents / 100;
};