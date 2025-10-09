import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlans } from "../../hooks/usePlans";
import { useCreateContract } from "../../hooks/useCreateContract";
import { useProcessPayment } from "../../hooks/usePayments";
import { useContracts } from "../../hooks/useContracts";
import { usePlanCredits } from "../../hooks/usePlanCredits";
import { useApiData } from "../../hooks/useApiData";
import Header from "../../components/Header";
import Pix from "react-qrcode-pix";
import { Footer, Modal, LoadingSpinner } from "../../components/ui";
import { PlanChangeDetails } from "../../components/domain/PlanChangeDetails";
import { formatCurrency } from "../../utils/formatters";

export const Payment = () => {
  const [pixPayload, setPixPayload] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
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
  const { refreshContracts, refreshPayments, refreshBalance } = useApiData();

  console.log("💳 [PAYMENT PAGE] Inicializando página de pagamento:", {
    planId,
    plansLoading,
    contractsLoading: false,
  });

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
  const { creditInfo } = usePlanCredits(
    activeContract,
    plan || undefined,
    userId
  );
  console.log("💰 [PAYMENT PAGE] Créditos calculados:", creditInfo);

  // Para novos contratos, buscar apenas créditos em saldo se não houver cálculo pro-rata
  const [balanceCredits, setBalanceCredits] = useState<number>(0);
  useEffect(() => {
    if (!creditInfo && plan) {
      fetch(`${import.meta.env.VITE_API_URL}/users/${userId}/balance`)
        .then((res) => res.json())
        .then((data) => setBalanceCredits(data.total_balance || 0))
        .catch((err) => console.error("Erro ao buscar saldo:", err));
    }
  }, [creditInfo, plan, userId]);

  // Saldo já vem em reais do backend
  const balanceCreditsInReais = balanceCredits;

  const handleConfirmPayment = async () => {
    if (!plan) return;

    setIsProcessing(true);

    try {
      console.log("🛒 INICIANDO CONTRATAÇÃO:", {
        plano: plan.description,
        preco: plan.price,
        isPlanChange: !!isPlanChange,
      });

      let contract;

      if (isPlanChange) {
        // Se já existe contrato ativo diferente do plano selecionado, fazer mudança de plano
        console.log("🔄 FAZENDO MUDANÇA DE PLANO");
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/contracts/${
            activeContract.id
          }/change-plan`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              new_plan_id: plan.id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Erro ao fazer mudança de plano");
        }

        const changeResult = await response.json();
        contract = changeResult.contract;

        console.log("✅ MUDANÇA DE PLANO REALIZADA:", changeResult);
        contract = changeResult.contract;

        // Para mudança de plano, o backend já criou o pagamento correto
        // Apenas atualizar os dados e redirecionar
        console.log("🎉 PAGAMENTO JÁ PROCESSADO PELO BACKEND NA MUDANÇA DE PLANO");
      } else {
        // Se não há contrato ativo, criar novo contrato
        const today = new Date();
        const endDate = new Date();
        endDate.setDate(today.getDate() + 30);

        const contractData = {
          user_id: 1, // Simulação com user_id fixo
          plan_id: plan.id,
          start_date: today.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
        };

        console.log("📝 CRIANDO NOVO CONTRATO:", contractData);
        contract = await createContract(contractData);

        if (!contract) {
          throw new Error("Erro ao criar contrato");
        }

        console.log("✅ NOVO CONTRATO CRIADO:", contract.id);

        // Calcular valor final com descontos aplicados
        let finalAmount: number;
        let discountApplied: number = 0;
        let proratedOld: number = 0;
        let proratedNew: number = 0;
        let appliedCredits: number = 0;

        if (creditInfo && isPlanChange) {
          finalAmount = creditInfo.finalPrice;
          proratedOld = creditInfo.proratedDiscount || 0;
          proratedNew = creditInfo.proratedNew || 0; // Valor cheio do plano novo
          appliedCredits = creditInfo.discount || 0;
          discountApplied = proratedOld + proratedNew + appliedCredits;
          console.log(
            "💰 [PAYMENT CALC] Usando creditInfo.finalPrice:",
            finalAmount
          );
        } else {
          finalAmount = Math.max(0, plan.price - balanceCredits);
          appliedCredits = balanceCredits;
          discountApplied = appliedCredits;
          console.log("💰 [PAYMENT CALC] Calculando manualmente:", {
            planPrice: plan.price,
            balanceCredits: balanceCredits,
            finalAmount: finalAmount,
          });
        }

        // Garantir que o valor seja exatamente 0 quando não houver cobrança
        if (finalAmount <= 0) {
          finalAmount = 0; // Exatamente 0 para evitar R$ 0,01
        } else {
          finalAmount = Math.max(0.01, finalAmount); // Mínimo de 0.01 apenas se houver cobrança
        }
        finalAmount = Math.round(finalAmount * 100) / 100; // Arredondar para 2 casas decimais

        // Sempre processar pagamento via PIX Simulado, independente do valor
        const paymentData = {
          contract_id: contract.id,
          amount: finalAmount, // Valor em reais
          payment_date: new Date().toISOString().split("T")[0],
          status: "paid",
          discount_applied: discountApplied,
          prorated_old: proratedOld,
          prorated_new: proratedNew,
          applied_credits: appliedCredits,
        };

        console.log("💳 PROCESSANDO PAGAMENTO VIA PIX SIMULADO:", {
          valorBruto: plan.price,
          valorFinalComDescontos: finalAmount,
          valorEnviadoReais: finalAmount, // Valor em reais (padrão americano)
          creditosAplicados: appliedCredits,
          status: "paid",
          descontos: {
            discount_applied: paymentData.discount_applied,
            prorated_old: paymentData.prorated_old,
            prorated_new: paymentData.prorated_new,
            applied_credits: paymentData.applied_credits,
          },
        });

        const payment = await processPayment(paymentData);

        if (payment) {
          console.log("🎉 PAGAMENTO CONFIRMADO VIA PIX SIMULADO:", {
            paymentId: payment.id,
            contractId: contract.id,
            valorPago: payment.amount, // payment.amount vem em reais do backend
            descontosAplicados: payment.discount_applied,
          });
        } else {
          throw new Error("Falha no processamento do pagamento");
        }
      }

      // Atualizar dados após contratação bem-sucedida (para ambos os casos)
      console.log("🔄 ATUALIZANDO DADOS APÓS PAGAMENTO...");
      await Promise.all([
        refreshContracts(1),
        refreshPayments(1),
        refreshBalance(1),
      ]);
      console.log("✅ DADOS ATUALIZADOS COM SUCESSO");

      // Aguardar pelo menos 3 segundos antes de redirecionar para garantir a experiência do usuário
      const minimumProcessingTime = 3000;
      const startTime = Date.now();

      const remainingTime =
        minimumProcessingTime - (Date.now() - startTime);
      if (remainingTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingTime));
      }

      // Redirecionar para home com parâmetro de sucesso
      navigate("/?success=payment");
    } catch (error) {
      console.error("❌ ERRO DURANTE O PROCESSAMENTO:", error);
      setIsProcessing(false);
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

      <Modal
        isOpen={isProcessing}
        onClose={() => {}}
        closeOnBackdropClick={false}
        size="sm"
      >
        <div className="text-center p-6">
          <LoadingSpinner className="mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Processando Pagamento...</h2>
          <p className="text-gray-600 mt-2">
            Aguarde um momento, estamos confirmando tudo para você.
          </p>
        </div>
      </Modal>

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
            <PlanChangeDetails
              creditInfo={creditInfo}
              formatCurrency={formatCurrency}
              showToCredit={true}
            />
          )}

          {!isPlanChange && balanceCredits > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <h3 className="font-semibold text-blue-800">
                Descontos Aplicados
              </h3>
              <p className="text-blue-700">
                Saldo em Crédito: {formatCurrency(balanceCreditsInReais)}
              </p>
              <p className="text-blue-700 font-bold">
                Valor Final:{" "}
                {formatCurrency(
                  Math.max(0, plan.price - balanceCreditsInReais)
                )}
              </p>
            </div>
          )}

          {!isPlanChange && balanceCredits === 0 && (
            <p className="text-lg font-bold mb-4">
              Preço: {formatCurrency(plan.price)}
            </p>
          )}

          {/* Se 'Total a pagar' > 0, mostra PIX Simulator */}
          {(() => {
            let finalAmount = 0;
            if (creditInfo && isPlanChange) {
              finalAmount = creditInfo.finalPrice;
            } else {
              finalAmount = Math.max(0, plan.price - balanceCreditsInReais);
            }
            return finalAmount > 0 ? (
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
                    // Calcular valor final considerando descontos (sempre positivo)
                    const pixAmount = finalAmount;
                    console.log(
                      "🔍 [PIX DEBUG] Tentando renderizar Pix com props:",
                      {
                        pixkey: "33208898000147",
                        merchant: "Inmediam",
                        city: "SAO PAULO",
                        amount: pixAmount,
                        size: 192,
                      }
                    );
                    return (
                      <Pix
                        pixkey={"33208898000147"} // Chave de email válida para teste
                        merchant={"Inmediam"} // Sem acentos
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
            ) : null;
          })()}
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
