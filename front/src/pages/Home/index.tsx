import { useState, useEffect } from "react";
import { usePlans } from "../../hooks/usePlans";
import { useContracts } from "../../hooks/useContracts";
import { useChangePlan } from "../../hooks/useChangePlan";
import { useUserBalance } from "../../hooks/useUserBalance";
import Header from "../../components/Header";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Notification, Footer, Card } from "../../components/ui";
import { PlanChangeModal, PlanCard } from "../../components/domain";
import { Plano, Contract } from "../../types";
import { formatCurrency } from "../../utils/formatters";

export const Home = () => {
  const { user } = useAuth();
  useUserBalance(user?.id || 0);
  const { plans, plansLoading, plansError } = usePlans();
  const {
    contracts,
    contractsLoading,
    contractsError,
  } = useContracts();
  const { } = useChangePlan();

  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);


  // Verificar parâmetro de sucesso na URL
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "payment") {
      setNotification({
        type: "success",
        message:
          "✅ Pagamento confirmado! Seu plano foi contratado com sucesso.",
      });
      // Remover parâmetro da URL
      searchParams.delete("success");
      setSearchParams(searchParams);
      // Esconder mensagem após 5 segundos
      setTimeout(() => setNotification(null), 5000);
    }
  }, [searchParams, setSearchParams]);

  const loading = plansLoading || contractsLoading;
  const error = plansError || contractsError;

  // Verificar se há contrato ativo
  const activeContract = contracts.find(
    (contract: Contract) => contract.status === "active"
  );


  const availablePlans = plans.filter(
    (plan: Plano) =>
      !activeContract ||
      !activeContract.plan ||
      plan.id !== activeContract.plan.id
  );

  // Removido: lógica para plano popular, pois no protótipo não há badges

  const userId = user?.id || 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-lg">Erro: {error}</div>
      </div>
    );
  }

  return (
    <>
      <Header user={user} />
      <main className="bg-gray-100 min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-6xl mx-auto">
        <h1 className="text-orange-400 text-2xl sm:text-3xl font-bold text-center mb-6 sm:mb-8">
          Planos Disponíveis
        </h1>

        {/* Notificações */}
        {notification && (
          <Notification
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
            autoHide={true}
            className="mb-6"
          />
        )}

        {activeContract && activeContract.plan && (
          <Card className="bg-green-100 border-green-400 text-green-700 mb-8">
            <div className="flex justify-between items-center">
              <span>
                Plano atual: {activeContract.plan.description} -{" "}
                {formatCurrency(activeContract.plan.price)}
                </span>
                {/* Add X para fechar card e não exibir ao entrar (local.storage) */}
            </div>
          </Card>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan: Plano) => {
            const isCurrentPlan =
              activeContract && activeContract.plan?.id === plan.id;

            return (
              <PlanCard
                key={plan.id}
                plan={plan}
                isCurrentPlan={isCurrentPlan}
                onSelect={(selectedPlan: Plano) => {
                  if (!isCurrentPlan) {
                    navigate(`/payment/${selectedPlan.id}`);
                  }
                  // Quando ativo, botão desabilitado
                }}
              />
            );
          })}
        </div>

        {activeContract && activeContract.plan && (
          <PlanChangeModal
            isOpen={isModalOpen}
            currentPlan={activeContract.plan}
            currentContract={activeContract}
            availablePlans={availablePlans}
            userId={userId}
            onClose={() => {
              setIsModalOpen(false);
            }}
          />
        )}
        </div>
      </main>
      <Footer />
    </>
  );
};
