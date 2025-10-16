import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '../ErrorBoundary'
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Erro de teste')
  }
  return <div>Componente funcionando</div>
}
const CustomFallback = () => <div data-testid="custom-fallback">Erro personalizado</div>

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deve renderizar children quando não há erro', () => {
    render(
      <ErrorBoundary>
        <div>Conteúdo normal</div>
      </ErrorBoundary>
    )

    expect(screen.getByText('Conteúdo normal')).toBeInTheDocument()
  })

  it('deve exibir fallback padrão quando um erro ocorre', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText(/Ocorreu um erro inesperado/)).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })

  it('deve exibir fallback personalizado quando fornecido', () => {
    render(
      <ErrorBoundary fallback={<CustomFallback />}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
    expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument()
  })

  it('deve chamar onError quando um erro ocorre', () => {
    const onErrorMock = vi.fn()

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )

    expect(onErrorMock).toHaveBeenCalledTimes(1)
    expect(onErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    )
  })

  it('deve exibir botão "Tentar novamente" quando há erro', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
    const button = screen.getByText('Tentar novamente')
    expect(button).toBeInTheDocument()
    expect(button).toBeVisible()
  })

  it('deve resetar automaticamente quando resetKeys mudam', async () => {
    const { rerender } = render(
      <ErrorBoundary resetOnPropsChange resetKeys={['key1']}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    )
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    rerender(
      <ErrorBoundary resetOnPropsChange resetKeys={['key2']}>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    )
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(screen.getByText('Componente funcionando')).toBeInTheDocument()
  })
})
