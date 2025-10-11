import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  /** Componentes filhos que serão monitorados por erros */
  children: ReactNode;
  /** UI personalizada para exibir quando ocorrer um erro */
  fallback?: ReactNode;
  /** Callback executado quando um erro é capturado */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Se true, reinicia automaticamente quando as props mudarem */
  resetOnPropsChange?: boolean;
  /** Chaves para detectar mudanças nas props e reiniciar o boundary */
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  /** Indica se há um erro capturado */
  hasError: boolean;
  /** Erro capturado */
  error?: Error;
  /** Informações adicionais do erro */
  errorInfo?: ErrorInfo;
}

/**
 * Componente Error Boundary para capturar e tratar erros JavaScript em componentes React.
 *
 * Error Boundaries são componentes React que capturam erros JavaScript em qualquer lugar
 * da árvore de componentes filhos, fazem log desses erros e exibem uma UI alternativa
 * em vez de quebrar toda a aplicação.
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MeuComponente />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * Método estático que atualiza o estado quando um erro é lançado.
   * @param error - Erro que foi lançado
   * @returns Novo estado indicando que há um erro
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  /**
   * Método executado após um erro ser lançado por um componente descendente.
   * @param error - Erro capturado
   * @param errorInfo - Informações sobre o componente que lançou o erro
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    this.props.onError?.(error, errorInfo);
  }

  /**
   * Verifica se as props mudaram e reinicia o boundary se necessário.
   */
  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && resetOnPropsChange && prevProps.resetKeys !== resetKeys) {
      if (resetKeys?.some((key, idx) => prevProps.resetKeys?.[idx] !== key)) {
        this.resetErrorBoundary();
      }
    }
  }

  /**
   * Reinicia o Error Boundary após um pequeno delay.
   */
  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      window.clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = window.setTimeout(() => {
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    }, 100);
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Algo deu errado
              </h3>
              <p className="text-gray-600 mb-4">
                Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver o problema.
              </p>
              <button
                onClick={this.resetErrorBoundary}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}