import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../ErrorBoundary';

// Componente que lança erro para teste
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
        throw new Error('Erro de teste');
    }
    return <div>Componente funcionando</div>;
};

// Componente personalizado de fallback
const CustomFallback = () => (
    <div data-testid="custom-fallback">Erro personalizado</div>
);

describe('ErrorBoundary', () => {
    beforeEach(() => {
        // Suprimir console.error durante os testes
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('deve renderizar children quando não há erro', () => {
        render(
            <ErrorBoundary>
                <div>Conteúdo normal</div>
            </ErrorBoundary>
        );

        expect(screen.getByText('Conteúdo normal')).toBeInTheDocument();
    });

    it('deve exibir fallback padrão quando um erro ocorre', () => {
        render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Algo deu errado')).toBeInTheDocument();
        expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument();
        expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
    });

    it('deve exibir fallback personalizado quando fornecido', () => {
        render(
            <ErrorBoundary fallback={<CustomFallback />}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
        expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
    });

    it('deve chamar onError quando um erro ocorre', () => {
        const onErrorMock = vi.fn();

        render(
            <ErrorBoundary onError={onErrorMock}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        expect(onErrorMock).toHaveBeenCalledTimes(1);
        expect(onErrorMock).toHaveBeenCalledWith(
            expect.any(Error),
            expect.objectContaining({
                componentStack: expect.any(String),
            })
        );
    });

    it('deve resetar o erro quando o botão "Tentar novamente" é clicado', () => {
        const { rerender } = render(
            <ErrorBoundary>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Deve mostrar o erro inicialmente
        expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

        // Clicar no botão "Tentar novamente"
        fireEvent.click(screen.getByText('Tentar novamente'));

        // Rerenderizar com shouldThrow=false para simular o reset
        rerender(
            <ErrorBoundary>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Componente funcionando')).toBeInTheDocument();
        expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument();
    });

    it('deve resetar automaticamente quando resetKeys mudam', () => {
        const { rerender } = render(
            <ErrorBoundary resetOnPropsChange resetKeys={['key1']}>
                <ThrowError shouldThrow={true} />
            </ErrorBoundary>
        );

        // Deve mostrar o erro inicialmente
        expect(screen.getByText('Algo deu errado')).toBeInTheDocument();

        // Mudar as resetKeys
        rerender(
            <ErrorBoundary resetOnPropsChange resetKeys={['key2']}>
                <ThrowError shouldThrow={false} />
            </ErrorBoundary>
        );

        expect(screen.getByText('Componente funcionando')).toBeInTheDocument();
    });
});