import { useState, useEffect } from "react";
import { usePlans } from "../../hooks/usePlans";
import { useContracts } from "../../hooks/useContracts";
import { useChangePlan } from "../../hooks/useChangePlan";
import { usePlanCredits } from "../../hooks/usePlanCredits";
import Header from "../../components/Header";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Notification } from "../../components/ui";

export const Home = () => {
  const { user } = useAuth();
  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const {
    contracts,
    loading: contractsLoading,
    error: contractsError,
    refetch: refetchContracts,
  } = useContracts(user?.id || 0);
  const {
    changePlan,
    loading: changePlanLoading,
    error: changePlanError,
  } = useChangePlan();

  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

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
    (contract) => contract.status === "active"
  );

  const handleChangePlan = async () => {
    if (!activeContract || !selectedPlanId) return;

    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    console.log("🔄 INICIANDO TROCA DE PLANO:", {
      contratoAtual: activeContract.id,
      planoAtual: activeContract.plan?.description,
      novoPlanoId: selectedPlanId,
      novoPlano: selectedPlan?.description,
      creditosAplicados: creditInfo?.discount || 0,
    });

    try {
      const result = await changePlan(activeContract.id, selectedPlanId);
      if (result) {
        console.log("✅ TROCA DE PLANO CONCLUÍDA:", {
          novoContrato: result.contract,
          plano: result.contract.plan?.description,
          creditos: result,
        });
        await refetchContracts();
        setIsModalOpen(false);
        setSelectedPlanId(null);

        const successMessage =
          result.final_amount === 0
            ? `🎉 Plano alterado para ${
                selectedPlan?.description || "novo plano"
              }! Créditos aplicados automaticamente.`
            : `🎉 Plano alterado para ${
                selectedPlan?.description || "novo plano"
              }`;

        const remainingCreditMessage =
          result.remaining_credit > 0
            ? ` Crédito restante: R$ ${result.remaining_credit.toFixed(
                2
              )} (adicionado como saldo para débitos futuros).`
            : "";

        setNotification({
          type: "success",
          message: successMessage + remainingCreditMessage,
        });
        setTimeout(() => setNotification(null), 5000);
      } else {
        setNotification({
          type: "error",
          message: "❌ Falha ao alterar plano. Tente novamente.",
        });
        setTimeout(() => setNotification(null), 5000);
      }
    } catch (error) {
      console.log("❌ FALHA NA TROCA DE PLANO:", error);
      setNotification({
        type: "error",
        message: "❌ Erro ao alterar plano. Tente novamente.",
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const availablePlans = plans.filter(
    (plan) =>
      !activeContract ||
      !activeContract.plan ||
      plan.id !== activeContract.plan.id
  );

  // Encontrar o plano mais barato para destacar como popular
  const cheapestPlan = plans.reduce(
    (prev, current) => (prev.price < current.price ? prev : current),
    plans[0]
  );

  // Calcular créditos para o plano selecionado
  const selectedPlan = plans.find((p) => p.id === selectedPlanId);
  const userId = user?.id || 0;
  const creditInfo = usePlanCredits(activeContract, selectedPlan, userId);

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
    <div className="min-h-screen bg-gray-100">
      <Header user={user} />
      <div className="container mx-auto px-4 py-8">
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
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-8 flex justify-between items-center">
            <span>
              Seu plano atual: {activeContract.plan.description} -{" "}
              {formatCurrency(activeContract.plan.price)}
            </span>
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              Trocar Plano
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
          {plans.map((plan) => {
            const isCurrentPlan =
              activeContract && activeContract.plan?.id === plan.id;
            const isPopular = plan.id === cheapestPlan.id;

            return (
              <div
                key={plan.id}
                className={`bg-white shadow-lg rounded-lg p-6 border relative ${
                  isCurrentPlan
                    ? "border-green-500 bg-green-50 opacity-75"
                    : isPopular
                    ? "border-orange-500"
                    : "border-gray-200"
                }`}
              >
                {/* Badge Popular */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                    Popular
                  </div>
                )}

                {/* Badge Plano Atual */}
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                    Seu Plano Atual
                  </div>
                )}

                <h2 className="text-xl font-semibold mb-4">
                  {plan.description}
                </h2>
                <div className="space-y-2 mb-4">
                  <p>
                    <strong>Vistorias:</strong> {plan.numberOfClients}
                  </p>
                  <p>
                    <strong>Preço:</strong> {formatCurrency(plan.price)} /mês
                  </p>
                  <p>
                    <strong>Armazenamento:</strong> {plan.gigabytesStorage} GB
                  </p>
                </div>

                <button
                  onClick={() =>
                    isCurrentPlan
                      ? setIsModalOpen(true)
                      : navigate(`/payment/${plan.id}`)
                  }
                  disabled={
                    isCurrentPlan &&
                    !availablePlans.some((p) => p.id !== plan.id)
                  }
                  className={`w-full py-2 px-4 rounded transition-colors ${
                    isCurrentPlan
                      ? "bg-green-500 text-white hover:bg-green-600 cursor-pointer"
                      : "bg-orange-500 text-white hover:bg-orange-600"
                  }`}
                >
                  {isCurrentPlan ? "Trocar Plano" : "Contratar Plano"}
                </button>
              </div>
            );
          })}
        </div>

        {/* Modal para trocar plano */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Trocar Plano</h2>

              {/* Plano Atual */}
              {activeContract && (
                <div className="mb-4 p-3 bg-blue-50 rounded">
                  <h3 className="font-semibold text-blue-800">Plano Atual</h3>
                  <p className="text-blue-700">
                    {activeContract.plan.description} -{" "}
                    {formatCurrency(activeContract.plan.price)}/mês
                  </p>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecione um novo plano:
                </label>
                <select
                  value={selectedPlanId || ""}
                  onChange={(e) => setSelectedPlanId(Number(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded"
                >
                  <option value="">Selecione um plano</option>
                  {availablePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.description} - {formatCurrency(plan.price)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Informações de Créditos */}
              {creditInfo && selectedPlan && (
                <div className="mb-4 p-3 bg-green-50 rounded">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Descontos:
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      Créditos (saldo):{" "}
                      <span className="font-bold text-green-700">
                        {formatCurrency(creditInfo.availableCredits)}
                      </span>
                    </p>
                    <p>
                      Desconto (pro-rata):{" "}
                      <span className="font-bold text-green-700">
                        {formatCurrency(creditInfo.discount)}
                      </span>
                    </p>
                    <p className="text-lg font-bold text-green-800 border-t pt-2">
                      Valor final: {formatCurrency(creditInfo.finalPrice)}
                    </p>
                  </div>
                </div>
              )}

              {changePlanError && (
                <div className="mb-4 text-red-500 text-sm">
                  Erro: {changePlanError}
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setSelectedPlanId(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleChangePlan}
                  disabled={!selectedPlanId || changePlanLoading}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changePlanLoading
                    ? "Alterando..."
                    : `Confirmar Troca ${
                        creditInfo
                          ? `(${formatCurrency(creditInfo.finalPrice)})`
                          : ""
                      }`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
