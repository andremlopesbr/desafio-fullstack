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
    currency: 'BRL'
  }).format(value)
}

export const formatDate = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleDateString('pt-BR')
}

export const formatDateTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return dateObj.toLocaleString('pt-BR')
}

/**
 * Converte valor de reais para centavos para envio à API
 * @param valueInReais - Valor em reais
 * @returns Valor em centavos (integer)
 *
 * FLUXO: Frontend (reais) → API (centavos)
 * Exemplo: 9.90 → 990, 87.00 → 8700
 */
export const convertToCents = (valueInReais: number): number => {
  const numericValue = typeof valueInReais === 'string' ? parseFloat(valueInReais) : valueInReais
  return Math.round(numericValue * 100)
}

/**
 * Converte valor de centavos para reais
 * @param valueInCents - Valor em centavos
 * @returns Valor em reais (decimal)
 *
 * FLUXO: API (centavos) → Frontend (reais)
 * Exemplo: 990 → 9.90
 */
export const convertToReais = (valueInCents: number): number => {
  return valueInCents / 100
}

/**
 * Calcula data de fim de contrato baseado em ciclo mensal
 *
 * Implementa lógica para calcular data do próximo mês mantendo o mesmo dia,
 * tratando exceções para dias inválidos (31 em mês com 30 dias, etc.)
 * Considera anos bissextos para fevereiro.
 *
 * @param startDate - Data de início do contrato (Date ou string ISO)
 * @returns Data de fim calculada (string ISO)
 *
 * @example
 * ```typescript
 * calculateContractEndDate("2025-01-15") // "2025-02-15"
 * calculateContractEndDate("2025-01-31") // "2025-02-28" (fevereiro não tem 31)
 * calculateContractEndDate("2024-01-29") // "2024-02-29" (ano bissexto)
 * ```
 */
export const calculateContractEndDate = (startDate: Date | string): string => {
  const start = startDate instanceof Date ? startDate : new Date(startDate)

  if (isNaN(start.getTime())) {
    throw new Error('Data de início inválida')
  }

  const currentDay = start.getDate()
  const currentMonth = start.getMonth()
  const currentYear = start.getFullYear()
  let endDate = new Date(currentYear, currentMonth + 1, currentDay)
  if (endDate.getMonth() !== (currentMonth + 1) % 12) {
    endDate = new Date(currentYear, currentMonth + 1, 0)
  }

  return endDate.toISOString()
}

/**
 * Calcula duração em dias entre duas datas
 * @param startDate - Data de início
 * @param endDate - Data de fim
 * @returns Número de dias entre as datas
 */
export const calculateDaysDifference = (
  startDate: Date | string,
  endDate: Date | string
): number => {
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Datas inválidas para cálculo de diferença')
  }

  const diffTime = Math.abs(end.getTime() - start.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Helper para tratamento seguro de dados do usuário autenticado
 *
 * Evita o padrão inseguro 'user?.id || 1' e fornece verificações robustas
 * para garantir que os dados do usuário sejam consistentes em toda a aplicação.
 *
 * @param user - Objeto do usuário do contexto de autenticação
 * @returns Dados seguros do usuário ou null se não autenticado
 *
 * @example
 * ```typescript
 * const userData = getAuthenticatedUserData(user);
 * if (!userData) {
 *   // Usuário não autenticado, redirecionar para login
 *   return <LoginRequired />;
 * }
 *
 * // Usar dados seguros: userData.id, userData.name, userData.email
 * ```
 */
export const getAuthenticatedUserData = (
  user: { id: number; name: string; email?: string } | null
) => {
  if (!user || !user.id || !user.name) {
    return null
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email || ''
  }
}

/**
 * Helper para criar dados de usuário fallback seguros para desenvolvimento
 * Usado apenas em ambiente de desenvolvimento quando não há usuário autenticado
 */
export const getFallbackUserData = () => {
  return {
    id: 1,
    name: 'Usuário Teste',
    email: 'teste@inmediam.com'
  }
}
