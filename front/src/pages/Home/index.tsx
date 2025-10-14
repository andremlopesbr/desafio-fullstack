import { useState, useEffect } from "react";
import { useApiData } from "../../hooks/useApiData";
import { useAuth } from "../../hooks/useAuth";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Notification, Card } from "../../components/ui";
import { PlanCard } from "../../components/domain";
import Layout from "../../components/Layout";
import { Plano, Contract } from "../../types";
import { formatCurrency } from "../../utils/formatters";

export const Home = () => {
  const { user } = useAuth();
  const {
    plans,
    plansLoading,
    plansError,
    contracts,
    contractsLoading,
    contractsError,
    refreshContracts,
    refreshPlans,
    refreshBalance,
    forceRefreshAllData
  } = useApiData();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasProcessedPayment, setHasProcessedPayment] = useState(false);

  // Carregar dados iniciais
  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUserId = user?.id || 1;
        await Promise.all([
          refreshPlans(),
          refreshContracts(currentUserId),
          refreshBalance(currentUserId)
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais');
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user?.id, refreshPlans, refreshContracts, refreshBalance]);

  // Verificar parâmetro de sucesso na URL
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "payment" && !hasProcessedPayment) {
      console.log("🏠 [HOME] Sucesso de pagamento detectado - iniciando refresh forçado");
      setHasProcessedPayment(true);

      setNotification({
        type: "success",
        message:
          "✅ Pagamento confirmado! Seu plano foi contratado com sucesso.",
      });

      // 🔥 EXECUTAR FORCE REFRESH IMEDIATO QUANDO HÁ SUCESSO DE PAGAMENTO
      if (user?.id) {
        console.log(`🚨 [HOME] Executando forceRefreshAllData para usuário ${user.id}`);
        setIsRefreshing(true);

        forceRefreshAllData(user.id)
          .then(() => {
            console.log("✅ [HOME] Force refresh concluído com sucesso");
          })
          .catch((error) => {
            console.error("❌ [HOME] Erro durante force refresh:", error);
          })
          .finally(() => {
            setIsRefreshing(false);
          });
      }

      // Remover parâmetro da URL
      searchParams.delete("success");
      setSearchParams(searchParams);

      // Esconder mensagem após 5 segundos
      setTimeout(() => setNotification(null), 5000);
    }
  }, [searchParams, setSearchParams, user?.id, forceRefreshAllData, hasProcessedPayment]);

  const loading = plansLoading || contractsLoading || isRefreshing;
  const error = plansError || contractsError;

  // Verificar se há contrato ativo
  const activeContract = contracts.find(
    (contract: Contract) => contract.status === "active"
  );

  // Removido: lógica para plano popular, pois no protótipo não há badges

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
    <Layout user={user}>
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)] p-4 sm:p-6 lg:p-8">
        <div className="w-full">
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

          {/* Indicador de refresh forçado */}
          {isRefreshing && (
            <Notification
              type="success"
              message="🔄 Atualizando dados... Aguarde um momento."
              onClose={() => {}} // Não permite fechar durante refresh
              autoHide={false}
              className="mb-4 border-blue-400 bg-blue-50"
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
        </div>
      </div>
    </Layout>
  );
};
