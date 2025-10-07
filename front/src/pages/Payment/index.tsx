import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlans } from "../../hooks/usePlans";
import { useCreateContract } from "../../hooks/useCreateContract";
import { useProcessPayment } from "../../hooks/usePayments";
import { useContracts } from "../../hooks/useContracts";
import { usePlanCredits } from "../../hooks/usePlanCredits";
import Header from "../../components/Header";
import Pix from "react-qrcode-pix";

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

  // Calcular créditos se for troca de plano
  const userId = 1; // Simulação com user_id fixo
  const creditInfo = usePlanCredits(activeContract, plan || undefined, userId);
  console.log("💰 [PAYMENT PAGE] Créditos calculados:", creditInfo);

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

      const finalAmount = creditInfo ? creditInfo.finalPrice : plan.price;
      const paymentData = {
        contract_id: contract.id,
        amount: finalAmount,
        payment_date: today.toISOString().split("T")[0],
        status: "paid",
      };

      console.log("💳 PROCESSANDO PAGAMENTO:", {
        valor: finalAmount,
        creditosAplicados: creditInfo?.discount || 0,
        status: "paid",
      });

      const payment = await processPayment(paymentData);

      if (payment) {
        console.log("🎉 PAGAMENTO CONFIRMADO:", {
          paymentId: payment.id,
          contractId: contract.id,
          valorPago: finalAmount,
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
      <div className="container mx-auto px-4 py-8">
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
                {formatCurrency(activeContract.plan.price)}/mês
              </p>
            </div>
          )}

          <div className="mb-4 p-3 bg-green-50 rounded">
            <h3 className="font-semibold text-green-800">
              {isPlanChange ? "Novo Plano" : "Plano Selecionado"}
            </h3>
            <p className="text-green-700">
              {plan.description} - {formatCurrency(plan.price)}/mês
            </p>
          </div>

          {creditInfo && isPlanChange && (
            <div className="mb-4 p-3 bg-yellow-50 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Resumo da Troca:
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  Créditos em saldo:{" "}
                  <span className="font-bold">
                    {formatCurrency(creditInfo.databaseCredits)}
                  </span>
                </p>
                <p>
                  Desconto pro-rata do plano anterior:{" "}
                  <span className="font-bold">
                    {formatCurrency(creditInfo.proratedDiscount)}
                  </span>
                </p>
                <p className="text-lg font-bold text-yellow-800 border-t pt-2 mt-2">
                  Total a pagar: {formatCurrency(creditInfo.finalPrice)}
                </p>
                <span>
                  À creditar:{" "}
                  {formatCurrency(
                    creditInfo.proratedDiscount +
                      creditInfo.databaseCredits -
                      plan.price
                  )}
                </span>
              </div>
            </div>
          )}

          {!isPlanChange && (
            <p className="text-lg font-bold mb-4">
              Preço: {formatCurrency(plan.price)}
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
                    ? creditInfo.finalPrice
                    : plan.price;
                  console.log(
                    "🔍 [PIX DEBUG] Tentando renderizar Pix com props:",
                    {
                      pixkey: "test@example.com",
                      merchant: "Empresa Ficticia",
                      city: "SAO PAULO",
                      amount: pixAmount,
                      size: 192,
                    }
                  );
                  return (
                    <Pix
                      pixkey={"test@example.com"} // Chave de email válida para teste
                      merchant={"Empresa Ficticia"} // Sem acentos
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
    </div>
  );
};
