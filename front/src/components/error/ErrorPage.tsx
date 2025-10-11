import { useNavigate } from 'react-router-dom';

interface ErrorPageProps {
    /** Título principal da página de erro */
    title?: string;
    /** Mensagem detalhada explicando o erro */
    message?: string;
    /** Controla se o botão "Página Inicial" é exibido */
    showHomeButton?: boolean;
    /** Controla se o botão "Voltar" é exibido */
    showBackButton?: boolean;
    /** Controla se o botão "Recarregar Página" é exibido */
    showRefreshButton?: boolean;
    /** Código de status HTTP do erro (opcional) */
    statusCode?: number;
}

/**
 * Página de erro personalizada para erros críticos da aplicação.
 *
 * Esta página fornece uma interface amigável para o usuário quando ocorrem
 * erros críticos que impedem o funcionamento normal da aplicação. Inclui
 * opções para tentar novamente, voltar à página anterior ou navegar para a página inicial.
 *
 * @param title - Título da página de erro (padrão: 'Erro Inesperado')
 * @param message - Mensagem explicativa do erro
 * @param showHomeButton - Exibir botão para ir à página inicial (padrão: true)
 * @param showBackButton - Exibir botão para voltar à página anterior (padrão: true)
 * @param showRefreshButton - Exibir botão para recarregar a página (padrão: true)
 * @param statusCode - Código de status HTTP do erro (opcional)
 *
 * @example
 * ```tsx
 * // Para erro 404
 * <ErrorPage
 *   title="Página não encontrada"
 *   message="A página que você está procurando não existe."
 *   statusCode={404}
 * />
 *
 * // Para erro de servidor
 * <ErrorPage
 *   title="Erro interno do servidor"
 *   message="Estamos enfrentando problemas técnicos. Tente novamente em alguns minutos."
 *   statusCode={500}
 * />
 * ```
 */
export function ErrorPage({
    title = 'Erro Inesperado',
    message = 'Ocorreu um erro inesperado. Nossa equipe foi notificada e estamos trabalhando para resolver o problema.',
    showHomeButton = true,
    showBackButton = true,
    showRefreshButton = true,
    statusCode
}: ErrorPageProps) {
    const navigate = useNavigate();

    const handleGoHome = () => {
        navigate('/');
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full">
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    {/* Ícone de erro */}
                    <div className="w-20 h-20 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    {/* Código de status */}
                    {statusCode && (
                        <div className="mb-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                                Erro {statusCode}
                            </span>
                        </div>
                    )}

                    {/* Título */}
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {title}
                    </h1>

                    {/* Mensagem */}
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {message}
                    </p>

                    {/* Botões de ação */}
                    <div className="space-y-3">
                        {showRefreshButton && (
                            <button
                                onClick={handleRefresh}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                            >
                                Recarregar Página
                            </button>
                        )}

                        <div className="flex gap-3">
                            {showBackButton && (
                                <button
                                    onClick={handleGoBack}
                                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Voltar
                                </button>
                            )}

                            {showHomeButton && (
                                <button
                                    onClick={handleGoHome}
                                    className="flex-1 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Página Inicial
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Informações de suporte */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                            Se o problema persistir, entre em contato com nosso suporte.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}