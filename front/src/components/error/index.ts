/**
 * Componentes de tratamento de erro da aplicação.
 *
 * Este módulo fornece componentes especializados para capturar, gerenciar e exibir
 * erros de forma elegante, melhorando a experiência do usuário quando ocorrem
 * problemas inesperados.
 *
 * @example
 * ```tsx
 * import { ErrorBoundary, ApiErrorBoundary, ErrorPage } from '@/components/error';
 *
 * // Uso básico
 * <ErrorBoundary>
 *   <MeuComponente />
 * </ErrorBoundary>
 *
 * // Para APIs
 * <ApiErrorBoundary context="Lista de Produtos">
 *   <ProdutosList />
 * </ApiErrorBoundary>
 * ```
 */

export { ErrorBoundary } from './ErrorBoundary'
export { ApiErrorBoundary } from './ApiErrorBoundary'
export { ErrorPage } from './ErrorPage'
export { ErrorFallback } from './ErrorFallback'
