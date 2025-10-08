import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlans } from "../../hooks/usePlans";
import { useCreateContract } from "../../hooks/useCreateContract";
import { useProcessPayment } from "../../hooks/usePayments";
import { useContracts } from "../../hooks/useContracts";
import { usePlanCredits } from "../../hooks/usePlanCredits";
import Header from "../../components/Header";
import Pix from "react-qrcode-pix";
import { Footer } from "../../components/ui";
import { PlanChangeDetails } from "../../components/domain/PlanChangeDetails";

export const Payment = () => {
  const [pixPayload, setPixPayload] = useState<string>("");
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { plans, loading: plansLoading, error: plansError } = usePlans();
  const {
    createContract,
    loading: contractLoading,
    error: contractError,
  } = useCreateContract();
  const {
    processPayment,
    loading: paymentLoading,
    error: paymentError,
  } = useProcessPayment();
  const { contracts } = useContracts(1); // Usuário fixo por enquanto

  console.log("💳 [PAYMENT PAGE] Inicializando página de pagamento:", {
    planId,
    plansLoading,
    contractsLoading: false,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };


  const plan = plans.find((p) => p.id === Number(planId));
  console.log(
    "📦 [PAYMENT PAGE] Plano encontrado:",
    plan ? { id: plan.id, name: plan.description, price: plan.price } : "NENHUM"
  );

  // Verificar se é troca de plano (usuário tem contrato ativo)
  const activeContract = contracts.find((c) => c.status === "active");
  console.log(
    "📋 [PAYMENT PAGE] Contratos carregados:",
    contracts.length,
    "contrato ativo:",
    activeContract ? activeContract.id : "NENHUM"
  );

  const isPlanChange =
    activeContract &&
    activeContract.plan &&
    activeContract.plan.id !== Number(planId);
  console.log("🔄 [PAYMENT PAGE] É troca de plano?", isPlanChange);

  // Calcular créditos sempre (para demonstrar descontos no checkout)
  const userId = 1; // Simulação com user_id fixo
  const creditInfo = usePlanCredits(activeContract, plan || undefined, userId);
  console.log("💰 [PAYMENT PAGE] Créditos calculados:", creditInfo);

  // Para novos contratos, buscar apenas créditos em saldo se não houver cálculo pro-rata
  const [balanceCredits, setBalanceCredits] = useState<number>(0);
  useEffect(() => {
    if (!creditInfo && plan) {
      fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`)
        .then(res => res.json())
        .then(data => setBalanceCredits(data.total_balance || 0))
        .catch(err => console.error('Erro ao buscar saldo:', err));
    }
  }, [creditInfo, plan, userId]);

  const handleConfirmPayment = async () => {
    if (!plan) return;

    console.log("🛒 INICIANDO CONTRATAÇÃO:", {
      plano: plan.description,
      preco: plan.price,
      isPlanChange: !!isPlanChange,
    });

    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 30);

    const contractData = {
      user_id: 1, // Simulação com user_id fixo
      plan_id: plan.id,
      start_date: today.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
    };

    console.log("📝 CRIANDO CONTRATO:", contractData);
    const contract = await createContract(contractData);

    if (contract) {
      console.log("✅ CONTRATO CRIADO:", contract.id);

      const paymentData = {
        contract_id: contract.id,
        amount: plan.price, // Valor já em centavos; backend aplica créditos automaticamente
        payment_date: today.toISOString().split("T")[0],
        status: "paid",
      };

      const calculatedFinal = creditInfo ? creditInfo.finalPrice : Math.max(0, plan.price - balanceCredits);
      console.log("💳 PROCESSANDO PAGAMENTO:", {
        valorBruto: plan.price,
        valorCalculadoFinal: calculatedFinal,
        creditosAplicados: creditInfo?.discount || balanceCredits || 0,
        status: "paid",
      });

      const payment = await processPayment(paymentData);

      if (payment) {
        console.log("🎉 PAGAMENTO CONFIRMADO:", {
          paymentId: payment.id,
          contractId: contract.id,
          valorPago: payment.amount / 100, // Converter de centavos
        });
        // Redirecionar para home com parâmetro de sucesso
        navigate("/?success=payment");
      } else {
        console.log("❌ PAGAMENTO FALHOU");
      }
    } else {
      console.log("❌ FALHA AO CRIAR CONTRATO");
    }
  };

  if (plansLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-lg">Carregando...</div>
      </div>
    );
  }

  if (plansError || contractError || paymentError || !plan) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-lg">
          Erro:{" "}
          {plansError ||
            contractError ||
            paymentError ||
            "Plano não encontrado"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Header user={{ id: 1, name: "Usuário Teste" }} />
      <div className="container mx-auto px-4 py-8 pb-20 sm:pb-16">
        <h1 className="text-orange-400 text-3xl font-bold text-center mb-8">
          Pagamento
        </h1>

        <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">
            {isPlanChange
              ? "Troca de Plano"
              : `Assinatura: ${plan.description}`}
          </h2>

          {isPlanChange && activeContract && activeContract.plan && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800">Plano Atual</h3>
              <p className="text-blue-700">
                {activeContract.plan.description} -{" "}
                {formatCurrency(activeContract.plan.price / 100)}/mês
              </p>
            </div>
          )}

          <div className="mb-4 p-3 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800">
              {isPlanChange ? "Novo Plano" : "Plano Selecionado"}
            </h3>
            <p className="text-green-700">
              {plan.description} - {formatCurrency(plan.price / 100)}/mês
            </p>
          </div>

          {creditInfo && isPlanChange && (
            <PlanChangeDetails
              newPlan={plan}
              creditInfo={creditInfo}
              formatCurrency={formatCurrency}
              showToCredit={true}
            />
          )}

          {!isPlanChange && balanceCredits > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800">Descontos Aplicados</h3>
              <p className="text-blue-700">
                Saldo em Crédito: {formatCurrency(balanceCredits)}
              </p>
              <p className="text-blue-700 font-bold">
                Valor Final: {formatCurrency(Math.max(0, plan.price - balanceCredits))}
              </p>
            </div>
          )}

          {!isPlanChange && balanceCredits === 0 && (
            <p className="text-lg font-bold mb-4">
              Preço: {formatCurrency(plan.price / 100)}
            </p>
          )}
          {creditInfo && creditInfo.finalPrice > 0 && (
            <div className="mb-6 text-center">
              <h3 className="text-lg font-medium mb-4">Pague com PIX</h3>

              {pixPayload && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    Código PIX (copia e cola):
                  </label>
                  <textarea
                    readOnly
                    value={pixPayload}
                    className="w-full p-2 border rounded text-xs font-mono bg-gray-50"
                    rows={4}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(pixPayload)}
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Copiar Código PIX
                  </button>
                </div>
              )}

              <div className="p-4 border inline-block rounded-lg">
                {(() => {
                  const pixAmount = creditInfo
                    ? creditInfo.finalPrice / 100
                    : Math.max(0, (plan.price - balanceCredits) / 100);
                  console.log(
                    "🔍 [PIX DEBUG] Tentando renderizar Pix com props:",
                    {
                      pixkey: "paid@example.com",
                      merchant: "InMediam",
                      city: "SAO PAULO",
                      amount: pixAmount,
                      size: 192,
                    }
                  );
                  return (
                    <Pix
                      pixkey={"paid@example.com"} // Chave de email válida para teste
                      merchant={"InMediam"} // Sem acentos
                      city={"SAO PAULO"}
                      amount={parseFloat(String(pixAmount))}
                      size={192}
                      onLoad={(payload: string) => {
                        console.log(
                          "✅ [PIX DEBUG] Pix carregado com sucesso, payload:",
                          payload
                        );
                        setPixPayload(payload);
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          )}
          <button
            onClick={handleConfirmPayment}
            disabled={contractLoading || paymentLoading}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
          >
            {contractLoading || paymentLoading
              ? "Processando..."
              : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};
