/**
 * Página de Pagamento - Implementa fluxo completo de pagamento com PIX
 *
 * Estados de Loading:
 * - isCreditCalculationReady: Controla loading específico na área de descontos
 *
 * Loading Específico na Área de Descontos:
 * - Exibe spinner apenas na seção de descontos durante cálculos
 */

import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApiData } from "../../hooks/useApiData";
import { useAuth } from "../../hooks/useAuth";
import { usePlanCredits } from "../../hooks/usePlanCredits";
import Pix from "react-qrcode-pix";
import { Modal, LoadingSpinner } from "../../components/ui";
import { PlanChangeDetails } from "../../components/domain/PlanChangeDetails";
import Layout from "../../components/Layout";
import { formatCurrency, calculateContractEndDate, getAuthenticatedUserData } from "../../utils/formatters";
import { Plano, Contract } from "../../types";

export const Payment = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pixPayload, setPixPayload] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const {
    plans,
    plansLoading,
    plansError,
    contracts,
    createContract,
    contractLoading,
    contractError,
    processPayment,
    paymentLoading,
    paymentError,
    refreshContracts,
    refreshPayments,
    refreshBalance
  } = useApiData();

  const plan = plans.find((p: Plano) => p.id === Number(planId));

  // Verificar se é troca de plano (usuário tem contrato ativo)
  const activeContract = contracts.find((c: Contract) => c.status === "active");
  const isPlanChange = !!(
    activeContract &&
    activeContract.plan &&
    activeContract.plan.id !== Number(planId)
  );

  // Verificação segura de autenticação (não fazer return antes de hooks)
  const userData = getAuthenticatedUserData(user);

  // Calcular créditos para mudança de plano
  const { creditInfo, isLoading: isCalculatingCredits } = usePlanCredits(
    activeContract || undefined,
    plan || undefined,
    userData ? userData.id : (user?.id ?? 0)
  );

  // Carregar dados iniciais
  useEffect(() => {
    const loadPaymentData = async () => {
      setIsLoadingDetails(true);
      try {
        if (!userData) {
          // nada a fazer se não houver userData
          return;
        }

        await Promise.all([
          refreshContracts(userData.id),
          refreshBalance(userData.id)
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados de pagamento');
      } finally {
        setIsLoadingDetails(false);
      }
    };

    if (user?.id) {
      loadPaymentData();
    }
  }, [user?.id, refreshContracts, refreshBalance, userData]);

  // Estado para verificar se dados básicos estão carregados (sem créditos)
  const isBasicDataReady = useMemo(() => {
    if (plansLoading) return false;
    if (isLoadingDetails) return false;
    if (!plan) return false;
    return true;
  }, [plansLoading, isLoadingDetails, plan]);

  // Estado específico para verificar se cálculos de crédito estão prontos
  const isCreditCalculationReady = useMemo(() => {
    if (!isPlanChange) return true; // Não é mudança de plano
    return !isCalculatingCredits; // Aguarda fim do cálculo de créditos
  }, [isPlanChange, isCalculatingCredits]);

  // Usar saldo do contexto em vez de estado local
  const currentBalance = 0;

  // Usar saldo do contexto (temporariamente 0 até implementar)


  const handleConfirmPayment = async () => {
    if (!plan) {
      console.error("❌ [PAYMENT] Plano não encontrado");
      return;
    }

    if (!planId || isNaN(Number(planId))) {
      console.error("❌ [PAYMENT] planId inválido:", planId);
      return;
    }

    // Verificação de autenticação - APÓS todos os hooks serem chamados
    if (!userData) {
      console.error('❌ [PAYMENT] Usuário não autenticado');
      // Não retornar JSX aqui (estamos dentro de um handler). Abortamos a operação.
      setIsProcessing(false);
      return;
    }

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
          `${import.meta.env.VITE_API_URL}/contracts/${activeContract.id
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
      } else {
        // Se não há contrato ativo, criar novo contrato
        const today = new Date();
        const endDateISO = calculateContractEndDate(today); // Usa helper para calcular data do próximo mês

        const contractData = {
          user_id: user?.id || 1, // TODO evite isso, podendo usar getAuthenticatedUserData ou para desenvolvimento o getFallbackUserData
          plan_id: plan.id,
          start_date: today.toISOString().split("T")[0],
          end_date: endDateISO.split("T")[0], // Data calculada com lógica de mês seguinte
        };

        contract = await createContract(contractData);

        if (!contract) {
          throw new Error("Erro ao criar contrato");
        }


        // Calcular valor final com descontos aplicados
        let finalAmount: number;
        let discountApplied: number = 0;
        let proratedOld: number = 0;
        let proratedNew: number = 0;
        let appliedCredits: number = 0;

        if (isPlanChange && creditInfo) {
          finalAmount = creditInfo.finalPrice;
          proratedOld = creditInfo.proratedDiscount || 0;
          proratedNew = creditInfo.proratedNew || 0; // Valor cheio do plano novo
          appliedCredits = creditInfo.discount || 0;
          discountApplied = proratedOld + proratedNew + appliedCredits;
          console.log(
            "💰 [PAYMENT CALC] Usando creditInfo.finalPrice para mudança de plano:",
            finalAmount
          );
        } else {
          finalAmount = Math.max(0, plan.price - currentBalance);
          appliedCredits = currentBalance;
          discountApplied = appliedCredits;
          console.log("💰 [PAYMENT CALC] Calculando com saldo para novo contrato:", {
            planPrice: plan.price,
            currentBalance: currentBalance,
            finalAmount: finalAmount,
          });
        }

        // Garantir que o valor seja exatamente 0 quando não houver cobrança
        if (finalAmount <= 0) {
          finalAmount = 0; // Exatamente 0 quando não há cobrança
        }
        finalAmount = Math.round(finalAmount * 100) / 100; // Arredondar para 2 casas decimais

        // Processar pagamento apenas se houver valor a ser pago
        if (finalAmount > 0) {
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
            });
          } else {
            throw new Error("Falha no processamento do pagamento");
          }
        }
      }

      // Atualizar dados após contratação bem-sucedida
      const currentUserId = user?.id || 1; // TODO evite isso, podendo usar getAuthenticatedUserData ou para desenvolvimento o getFallbackUserData
      await Promise.all([
        refreshContracts(currentUserId),
        refreshPayments(currentUserId),
        refreshBalance(currentUserId),
      ]);

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

  // Loading inicial apenas se dados básicos não estiverem prontos
  if (!isBasicDataReady) {
    // TODO evite isso, podendo usar getAuthenticatedUserData ou para desenvolvimento o getFallbackUserData
    const currentUserId = user?.id || 1;
    const currentUserName = user?.name || "Usuário Teste";

    return (
      <Layout user={{ id: currentUserId, name: currentUserName }}>
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-orange-400 text-3xl font-bold text-center mb-8">
            {plansLoading
              ? "Carregando Planos..."
              : "Carregando Dados do Pagamento..."
            }
          </h1>
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <LoadingSpinner className="mx-auto mb-4 h-8 w-8" />
              <p className="text-gray-600">
                {plansLoading
                  ? "Carregando informações dos planos disponíveis..."
                  : "Carregando contratos e saldo do usuário..."
                }
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={user ? { id: user.id, name: user.name } : { id: 1, name: "Usuário Teste" }}>
      <Modal
        isOpen={isProcessing}
        onClose={() => { }}
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

          {/* Área específica de descontos/créditos - conforme solicitado */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Descontos:</h3>

            {!isCreditCalculationReady ? (
              /* Loading apenas nesta área específica */
              <div className="p-4 bg-gray-50 rounded border-2 border-dashed border-gray-300">
                <div className="flex items-center justify-center text-gray-500">
                  <LoadingSpinner className="mr-2 h-5 w-5" />
                  <span>Calculando descontos...</span>
                </div>
              </div>
            ) : creditInfo && isPlanChange ? (
              /* Exibição completa quando cálculos prontos */
              <PlanChangeDetails
                creditInfo={creditInfo}
                formatCurrency={formatCurrency}
                showToCredit={true}
              />
            ) : isPlanChange ? (
              /* Estado intermediário para mudança de plano */
              <div className="p-3 bg-blue-50 rounded border border-blue-200 text-center text-blue-700 text-sm">
                Aguardando cálculo de descontos proporcionais...
              </div>
            ) : currentBalance > 0 ? (
              /* Desconto para novos contratos com saldo */
              <div className="p-3 bg-green-50 rounded">
                <p className="text-green-700">
                  Saldo em Crédito: {formatCurrency(currentBalance)}
                </p>
                <p className="text-green-700 font-bold">
                  Valor Final: {formatCurrency(Math.max(0, plan.price - currentBalance))}
                </p>
              </div>
            ) : (
              /* Sem descontos */
              <div className="p-3 bg-gray-50 rounded text-center text-gray-500 text-sm">
                Nenhum desconto aplicável
              </div>
            )}
          </div>

          {/* Preço sem descontos (apenas para novos contratos sem saldo) */}
          {!isPlanChange && currentBalance === 0 && (
            <p className="text-lg font-bold mb-4">
              Preço: {formatCurrency(plan.price)}
            </p>
          )}

          {/* PIX Simulator - mostra apenas se houver valor a pagar */}
          {(() => {
            let finalAmount = 0;
            if (creditInfo && isPlanChange) {
              finalAmount = creditInfo.finalPrice;
            } else {
              finalAmount = Math.max(0, plan.price - currentBalance);
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
            disabled={contractLoading || paymentLoading || isProcessing}
            className="w-full bg-orange-500 text-white py-3 px-4 rounded hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Processando Pagamento...
              </>
            ) : contractLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Carregando Contrato...
              </>
            ) : paymentLoading ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Processando Pagamento...
              </>
            ) : (
              "Confirmar Pagamento"
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
};
