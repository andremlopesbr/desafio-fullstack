import { usePlans } from './hooks/usePlans';
import { useAuth } from './hooks/useAuth';
import { useHomePage } from './hooks/useHomePage';
import Header from './components/Header';
import { PlanCard } from './components/domain';

export function App() {
  const { user } = useAuth();

  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const { contracts, contractsLoading, handleSelecionarPlano, isCurrentPlan } = useHomePage();

  if (plansLoading || contractsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          Carregando...
        </div>
      </div>
    );
  }

  if (plansError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-red-600">Erro ao carregar dados: {plansError}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap'); body { font-family: 'Inter', sans-serif; }`}</style>

      <Header user={user} />

      <main className="p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
          {contracts.length > 0 && contracts[0]?.plan && (
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
              <h2 className="text-2xl font-bold text-gray-800">Seu Plano Atual</h2>
              <p className="text-gray-600 mt-2">Você está atualmente no <span className="font-bold">{contracts[0].plan.description}</span>.</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {plans.map((plano) => (
              <PlanCard
                key={plano.id}
                plan={plano}
                isCurrentPlan={isCurrentPlan(plano)}
                onSelect={handleSelecionarPlano}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

