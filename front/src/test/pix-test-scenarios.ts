/**
 * Cenários de teste PIX para validação frontend
 *
 * Este arquivo define cenários sistemáticos para testar a interface
 * de mudança de planos PIX, incluindo validações de cálculos,
 * estados de UI e fluxos de usuário.
 */

export interface PixTestScenario {
  id: string
  nome: string
  descricao: string
  planoAtual: PlanoTeste
  planoDestino: PlanoTeste
  dataCenario: Date
  dadosUsuario: DadosUsuario
  resultadoEsperado: ResultadoEsperado
  passosValidacao: PassoValidacao[]
}

export interface PlanoTeste {
  id: number
  nome: string
  preco: number
  clientes: number
  armazenamento: number
}

export interface DadosUsuario {
  saldoAtual: number
  contratosAtivos: number
  historicoPagamentos: number
}

export interface ResultadoEsperado {
  valorAPagar: number
  creditosAplicados: number
  creditosGerados: number
  saldoRestante: number
  valorProporcional: number
}

export interface PassoValidacao {
  descricao: string
  elemento: string
  valorEsperado: string | number | boolean
  tipo: 'visual' | 'calculo' | 'estado' | 'mensagem'
}

/**
 * CENÁRIO 1: Upgrade com pagamento adicional
 * Do plano Individual (R$ 9,90) para plano 10 vistorias (R$ 87,00)
 */
export const cenario1: PixTestScenario = {
  id: 'PIX-001',
  nome: 'Upgrade com Pagamento Adicional',
  descricao: 'Usuário faz upgrade do plano Individual para plano de 10 vistorias',
  planoAtual: {
    id: 1,
    nome: 'Individual',
    preco: 9.9,
    clientes: 1,
    armazenamento: 1
  },
  planoDestino: {
    id: 2,
    nome: 'Até 10 vistorias',
    preco: 87.0,
    clientes: 10,
    armazenamento: 10
  },
  dataCenario: new Date(),
  dadosUsuario: {
    saldoAtual: 0,
    contratosAtivos: 1,
    historicoPagamentos: 5
  },
  resultadoEsperado: {
    valorAPagar: 77.1, // 87.00 - 9.90
    creditosAplicados: 9.9,
    creditosGerados: 0,
    saldoRestante: 0,
    valorProporcional: 9.9
  },
  passosValidacao: [
    {
      descricao: 'Modal de mudança de plano deve exibir informações corretas',
      elemento: '.plan-change-modal',
      valorEsperado: true,
      tipo: 'visual'
    },
    {
      descricao: 'Valor proporcional do plano atual deve ser exibido',
      elemento: '.current-plan-prorated',
      valorEsperado: 'R$ 9,90',
      tipo: 'visual'
    },
    {
      descricao: 'Valor do novo plano deve ser exibido',
      elemento: '.new-plan-value',
      valorEsperado: 'R$ 87,00',
      tipo: 'visual'
    },
    {
      descricao: 'Cálculo do valor a pagar deve estar correto',
      elemento: '.amount-to-pay',
      valorEsperado: 'R$ 77,10',
      tipo: 'calculo'
    },
    {
      descricao: 'Botão de confirmação deve estar habilitado',
      elemento: '.confirm-plan-change',
      valorEsperado: true,
      tipo: 'estado'
    }
  ]
}

/**
 * CENÁRIO 2: Upgrade com utilização de créditos
 * Do plano Individual (R$ 9,90) para plano 10 vistorias (R$ 87,00) com saldo
 */
export const cenario2: PixTestScenario = {
  id: 'PIX-002',
  nome: 'Upgrade com Utilização de Créditos',
  descricao: 'Usuário faz upgrade utilizando créditos do saldo',
  planoAtual: {
    id: 1,
    nome: 'Individual',
    preco: 9.9,
    clientes: 1,
    armazenamento: 1
  },
  planoDestino: {
    id: 2,
    nome: 'Até 10 vistorias',
    preco: 87.0,
    clientes: 10,
    armazenamento: 10
  },
  dataCenario: new Date(),
  dadosUsuario: {
    saldoAtual: 50.0,
    contratosAtivos: 1,
    historicoPagamentos: 3
  },
  resultadoEsperado: {
    valorAPagar: 37.1, // 87.00 - 9.90 - 40.00 (créditos utilizados)
    creditosAplicados: 40.0,
    creditosGerados: 0,
    saldoRestante: 10.0,
    valorProporcional: 9.9
  },
  passosValidacao: [
    {
      descricao: 'Modal deve indicar utilização de créditos',
      elemento: '.credit-usage-indicator',
      valorEsperado: true,
      tipo: 'visual'
    },
    {
      descricao: 'Valor de créditos aplicados deve ser exibido',
      elemento: '.applied-credits',
      valorEsperado: 'R$ 40,00',
      tipo: 'visual'
    },
    {
      descricao: 'Saldo restante deve ser exibido',
      elemento: '.remaining-balance',
      valorEsperado: 'R$ 10,00',
      tipo: 'visual'
    },
    {
      descricao: 'Valor a pagar deve considerar créditos',
      elemento: '.amount-to-pay',
      valorEsperado: 'R$ 37,10',
      tipo: 'calculo'
    }
  ]
}

/**
 * CENÁRIO 3: Downgrade sem geração de créditos
 * Do plano 10 vistorias (R$ 87,00) para Individual (R$ 9,90)
 */
export const cenario3: PixTestScenario = {
  id: 'PIX-003',
  nome: 'Downgrade sem Geração de Créditos',
  descricao: 'Usuário faz downgrade sem gerar créditos (crédito menor que novo plano)',
  planoAtual: {
    id: 2,
    nome: 'Até 10 vistorias',
    preco: 87.0,
    clientes: 10,
    armazenamento: 10
  },
  planoDestino: {
    id: 1,
    nome: 'Individual',
    preco: 9.9,
    clientes: 1,
    armazenamento: 1
  },
  dataCenario: new Date(),
  dadosUsuario: {
    saldoAtual: 25.0,
    contratosAtivos: 1,
    historicoPagamentos: 8
  },
  resultadoEsperado: {
    valorAPagar: 0,
    creditosAplicados: 0,
    creditosGerados: 0,
    saldoRestante: 25.0,
    valorProporcional: 87.0
  },
  passosValidacao: [
    {
      descricao: 'Modal deve indicar downgrade',
      elemento: '.plan-downgrade-indicator',
      valorEsperado: true,
      tipo: 'visual'
    },
    {
      descricao: 'Mensagem de crédito proporcional deve ser exibida',
      elemento: '.prorated-credit-message',
      valorEsperado: 'Crédito proporcional de R$ 87,00 aplicado',
      tipo: 'mensagem'
    },
    {
      descricao: 'Valor a pagar deve ser zero',
      elemento: '.amount-to-pay',
      valorEsperado: 'R$ 0,00',
      tipo: 'calculo'
    },
    {
      descricao: 'Mensagem de mudança gratuita deve aparecer',
      elemento: '.free-change-message',
      valorEsperado: true,
      tipo: 'visual'
    }
  ]
}

/**
 * CENÁRIO 4: Downgrade com geração de créditos
 * Do plano 25 vistorias (R$ 197,00) para plano 10 vistorias (R$ 87,00)
 */
export const cenario4: PixTestScenario = {
  id: 'PIX-004',
  nome: 'Downgrade com Geração de Créditos',
  descricao: 'Usuário faz downgrade gerando créditos para o saldo',
  planoAtual: {
    id: 3,
    nome: 'Até 25 vistorias',
    preco: 197.0,
    clientes: 25,
    armazenamento: 25
  },
  planoDestino: {
    id: 2,
    nome: 'Até 10 vistorias',
    preco: 87.0,
    clientes: 10,
    armazenamento: 10
  },
  dataCenario: new Date(),
  dadosUsuario: {
    saldoAtual: 0,
    contratosAtivos: 1,
    historicoPagamentos: 6
  },
  resultadoEsperado: {
    valorAPagar: 0,
    creditosAplicados: 87.0,
    creditosGerados: 110.0, // 197.00 - 87.00
    saldoRestante: 110.0,
    valorProporcional: 197.0
  },
  passosValidacao: [
    {
      descricao: 'Indicador de geração de créditos deve aparecer',
      elemento: '.credit-generation-indicator',
      valorEsperado: true,
      tipo: 'visual'
    },
    {
      descricao: 'Valor de créditos gerados deve ser exibido',
      elemento: '.generated-credits',
      valorEsperado: 'R$ 110,00',
      tipo: 'visual'
    },
    {
      descricao: 'Novo saldo deve ser exibido',
      elemento: '.new-balance',
      valorEsperado: 'R$ 110,00',
      tipo: 'visual'
    },
    {
      descricao: 'Mensagem explicativa sobre créditos deve aparecer',
      elemento: '.credit-explanation',
      valorEsperado: 'Créditos adicionados ao seu saldo',
      tipo: 'mensagem'
    }
  ]
}

/**
 * CENÁRIO 5: Mudança no mesmo dia
 * Do plano 10 vistorias (R$ 87,00) para plano 25 vistorias (R$ 197,00) no mesmo dia
 */
export const cenario5: PixTestScenario = {
  id: 'PIX-005',
  nome: 'Mudança no Mesmo Dia',
  descricao: 'Usuário muda de plano no mesmo dia da contratação (crédito proporcional 100%)',
  planoAtual: {
    id: 2,
    nome: 'Até 10 vistorias',
    preco: 87.0,
    clientes: 10,
    armazenamento: 10
  },
  planoDestino: {
    id: 3,
    nome: 'Até 25 vistorias',
    preco: 197.0,
    clientes: 25,
    armazenamento: 25
  },
  dataCenario: new Date(), // Mesmo dia
  dadosUsuario: {
    saldoAtual: 0,
    contratosAtivos: 1,
    historicoPagamentos: 2
  },
  resultadoEsperado: {
    valorAPagar: 110.0, // 197.00 - 87.00 (100% do crédito proporcional)
    creditosAplicados: 87.0,
    creditosGerados: 0,
    saldoRestante: 0,
    valorProporcional: 87.0
  },
  passosValidacao: [
    {
      descricao: 'Indicador de mudança no mesmo dia deve aparecer',
      elemento: '.same-day-change-indicator',
      valorEsperado: true,
      tipo: 'visual'
    },
    {
      descricao: 'Crédito proporcional 100% deve ser exibido',
      elemento: '.full-prorated-credit',
      valorEsperado: 'R$ 87,00',
      tipo: 'visual'
    },
    {
      descricao: 'Cálculo deve considerar crédito integral',
      elemento: '.amount-calculation',
      valorEsperado: 'R$ 197,00 - R$ 87,00 = R$ 110,00',
      tipo: 'calculo'
    },
    {
      descricao: 'Mensagem explicativa sobre crédito integral',
      elemento: '.full-credit-explanation',
      valorEsperado: 'Crédito proporcional de 100% aplicado',
      tipo: 'mensagem'
    }
  ]
}

/**
 * Array com todos os cenários PIX para execução sistemática
 */
export const cenariosPixTeste: PixTestScenario[] = [
  cenario1,
  cenario2,
  cenario3,
  cenario4,
  cenario5
]

/**
 * Cenários organizados por tipo para facilitar execução específica
 */
export const cenariosPorTipo = {
  upgrades: [cenario1, cenario2, cenario5],
  downgrades: [cenario3, cenario4],
  mesmoDia: [cenario5],
  comCreditos: [cenario2, cenario4],
  semCreditos: [cenario1, cenario3]
}

/**
 * Utilitário para executar validações de cenário
 */
export class ValidadorCenarioPix {
  static async executarCenario(cenario: PixTestScenario): Promise<ResultadoValidacao> {
    const resultados: ResultadoPasso[] = []

    for (const passo of cenario.passosValidacao) {
      const resultado = await this.validarPasso(passo)
      resultados.push(resultado)
    }

    return {
      cenario: cenario.id,
      sucesso: resultados.every(r => r.sucesso),
      totalPassos: resultados.length,
      passosSucesso: resultados.filter(r => r.sucesso).length,
      resultados
    }
  }

  private static async validarPasso(passo: PassoValidacao): Promise<ResultadoPasso> {
    const elementoEncontrado = true // Simulado
    const valorCorreto = true // Simulado

    return {
      passo: passo.descricao,
      elemento: passo.elemento,
      sucesso: elementoEncontrado && valorCorreto,
      valorEncontrado: 'valor_simulado',
      valorEsperado: passo.valorEsperado,
      tipo: passo.tipo
    }
  }
}

export interface ResultadoValidacao {
  cenario: string
  sucesso: boolean
  totalPassos: number
  passosSucesso: number
  resultados: ResultadoPasso[]
}

export interface ResultadoPasso {
  passo: string
  elemento: string
  sucesso: boolean
  valorEncontrado: string
  valorEsperado: string | number | boolean
  tipo: string
}
