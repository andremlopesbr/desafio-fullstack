import React from 'react';
import { usePlans } from './hooks/usePlans';
import { useAuth } from './hooks/useAuth';
import { useHomePage } from './hooks/useHomePage';
import Header from './components/Header';
import { PlanCard } from './components/domain';
import { Plano } from './types';
import { ErrorBoundary, ApiErrorBoundary } from './components/error';
import { ErrorMessage } from './components/ui/ErrorMessage';
import { useErrorHandler } from './hooks/useErrorHandler';

/**
 * Componente principal da aplicação com tratamento robusto de erros.
 *
 * Esta aplicação utiliza Error Boundaries para capturar e tratar erros de forma
 * elegante, melhorando significativamente a experiência do usuário quando ocorrem
 * problemas inesperados.
 */
export function App() {
  const { user } = useAuth();
  const { error, retry, setRetry } = useErrorHandler();

  const { plans, plansLoading, plansError, refreshPlans } = usePlans();
  const { contracts, contractsLoading, handleSelecionarPlano, isCurrentPlan } = useHomePage();

  // Configurar função de retry para dados da API
  React.useEffect(() => {
    if (plansError && refreshPlans) {
      setRetry(() => refreshPlans);
    }
  }, [plansError, refreshPlans, setRetry]);

  if (plansLoading || contractsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Erro crítico na aplicação:', error, errorInfo);
      }}
      resetOnPropsChange
      resetKeys={user?.id ? [user.id] : []}
    >
      <div className="bg-gray-100 min-h-screen">
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>

        <ApiErrorBoundary context="Cabeçalho da aplicação">
          <Header user={user} />
        </ApiErrorBoundary>

        <main className="p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-6xl mx-auto">
            {error && (
              <ErrorMessage
                error={error.message}
                retry={retry || undefined}
                className="mb-6"
              />
            )}

            <ApiErrorBoundary context="Dados do contrato atual">
              {contracts.length > 0 && contracts[0]?.plan && (
                <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">Seu Plano Atual</h2>
                  <p className="text-gray-600 mt-2">
                    Você está atualmente no <span className="font-bold">{contracts[0].plan.description}</span>.
                  </p>
                </div>
              )}
            </ApiErrorBoundary>

            <ApiErrorBoundary context="Lista de planos disponíveis">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {plans.map((plano: Plano) => (
                  <PlanCard
                    key={plano.id}
                    plan={plano}
                    isCurrentPlan={isCurrentPlan(plano)}
                    onSelect={handleSelecionarPlano}
                  />
                ))}
              </div>
            </ApiErrorBoundary>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
