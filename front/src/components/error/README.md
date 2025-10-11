# Error Boundaries - Documentação

Este módulo implementa Error Boundaries seguindo as melhores práticas React para melhorar a experiência do usuário quando ocorrem erros inesperados na aplicação.

## 📋 Visão Geral

Error Boundaries são componentes React que capturam erros JavaScript em qualquer lugar da árvore de componentes filhos, fazem log desses erros e exibem uma UI alternativa em vez de quebrar toda a aplicação.

## 🏗️ Arquitetura

### Componentes Implementados

1. **ErrorBoundary** - Componente genérico para capturar erros em qualquer parte da aplicação
2. **ApiErrorBoundary** - Especializado para erros relacionados a APIs e comunicação externa
3. **ErrorPage** - Página completa para erros críticos que afetam toda a aplicação
4. **useErrorHandler** - Hook para tratamento centralizado de erros

## 🚀 Como Usar

### ErrorBoundary Básico

```tsx
import { ErrorBoundary } from '@/components/error';

function MeuComponente() {
  return (
    <ErrorBoundary>
      <ComponenteQuePodeFalhar />
    </ErrorBoundary>
  );
}
```

### Com Fallback Personalizado

```tsx
const fallbackUI = (
  <div className="error-fallback">
    <h3>Ops! Algo deu errado</h3>
    <button onClick={() => window.location.reload()}>
      Recarregar página
    </button>
  </div>
);

<ErrorBoundary fallback={fallbackUI}>
  <MeuComponente />
</ErrorBoundary>
```

### Para APIs com ApiErrorBoundary

```tsx
import { ApiErrorBoundary } from '@/components/error';

function ListaDeProdutos() {
  return (
    <ApiErrorBoundary context="Lista de Produtos">
      <ProdutosComponent />
    </ApiErrorBoundary>
  );
}
```

### Hook useErrorHandler

```tsx
import { useErrorHandler } from '@/hooks/useErrorHandler';

function MeuComponente() {
  const { error, setError, clearError, retry, setRetry } = useErrorHandler();

  const fazerRequisicao = async () => {
    try {
      await api.fazerRequisicao();
    } catch (err) {
      setError(err, 'Requisição para API');
      setRetry(() => fazerRequisicao);
    }
  };

  if (error) {
    return (
      <div>
        <ErrorMessage error={error.message} retry={retry} />
      </div>
    );
  }

  return <div>Componente funcionando normalmente</div>;
}
```

## 🔧 Características Técnicas

### ErrorBoundary

- **Captura automática de erros**: Todos os erros não capturados em componentes filhos
- **Fallback UI elegante**: Interface padrão com opção de personalização
- **Reset automático**: Capacidade de reset baseada em mudanças de props
- **Logging detalhado**: Informações completas sobre erros para monitoramento
- **Callback personalizado**: Função onError para integração com serviços externos

### ApiErrorBoundary

- **Integração com useErrorHandler**: Tratamento centralizado de erros
- **Retry automático**: Funcionalidades específicas para erros de API
- **Contexto detalhado**: Informação sobre onde o erro ocorreu
- **Estados de loading**: Indicadores visuais durante retry

### useErrorHandler

- **Estado centralizado**: Gerenciamento unificado de erros
- **Integração com AuthContext**: Inclusão automática de informações do usuário
- **Logging estruturado**: Formatação padronizada para monitoramento
- **Funções de retry**: Gerenciamento de tentativas de recuperação

## 📊 Monitoramento e Logging

Os componentes estão preparados para integração com serviços de monitoramento como:

- **Sentry**: Para captura e análise de erros em produção
- **LogRocket**: Para análise de sessão e debugging
- **DataDog**: Para métricas e dashboards de erro

### Exemplo de Integração com Sentry

```tsx
// Em useErrorHandler.ts
import * as Sentry from '@sentry/react';

// Dentro do setError
Sentry.captureException(errorObj, {
  contexts: {
    errorInfo: info,
    user: { id: user?.id }
  }
});
```

## 🧪 Testes

### Executar Testes

```bash
# Todos os testes
npm run test

# Apenas testes de erro
npm run test components/error

# Com interface gráfica
npm run test:ui
```

### Cobertura de Testes

- ✅ Renderização sem erro
- ✅ Captura e exibição de erros
- ✅ Funcionalidade de retry
- ✅ Reset automático por props
- ✅ Callbacks personalizados
- ✅ Fallbacks customizados

## 🎨 Padrões de UI/UX

### Cores e Estilos

- **Vermelho**: Para elementos de erro (bg-red-100, text-red-600)
- **Laranja**: Para botões de ação (bg-orange-500, hover:bg-orange-600)
- **Cinza**: Para textos informativos (text-gray-600)

### Ícones

- **SVG padrão**: Ícone de alerta consistente em todos os componentes
- **Tamanhos padronizados**: w-8 h-8 para ícones principais
- **Posicionamento**: Centralizados e com espaçamento adequado

### Responsividade

- **Mobile-first**: Design responsivo para todos os tamanhos de tela
- **Breakpoints**: Utiliza classes Tailwind sm:, lg:, etc.
- **Acessibilidade**: Botões com foco adequado e textos claros

## 🔒 Tratamento de Erros de Segurança

### Dados Sensíveis

- **Stack traces**: Apenas em desenvolvimento
- **Informações pessoais**: Apenas IDs de usuário, nunca dados completos
- **URLs**: Sanitizadas para remover parâmetros sensíveis

### Logs de Produção

```tsx
// Apenas informações necessárias
const productionError = {
  message: error.message,
  context: errorInfo.context,
  userId: user?.id,
  timestamp: new Date().toISOString(),
  // Sem stack trace em produção
};
```

## 🚀 Boas Práticas Implementadas

1. **Granularidade**: Error boundaries específicos para diferentes áreas
2. **Recuperação**: Sempre oferecer opções de retry ou navegação alternativa
3. **Feedback visual**: Indicadores claros de erro e estados de loading
4. **Logging adequado**: Informações suficientes para debugging sem expor dados sensíveis
5. **Experiência do usuário**: Mensagens claras e ações óbvias
6. **Performance**: Reset automático baseado em mudanças de estado
7. **Acessibilidade**: Componentes acessíveis com navegação por teclado

## 🔮 Próximas Melhorias

- [ ] Integração com serviço de monitoramento (Sentry/LogRocket)
- [ ] Métricas de erro no analytics
- [ ] Tradução automática de mensagens de erro
- [ ] Cache de fallbacks para offline
- [ ] Testes de integração com APIs mockadas
- [ ] Documentação interativa com Storybook

## 📞 Suporte

Para dúvidas ou problemas relacionados aos Error Boundaries:

1. Verifique os logs no console do navegador
2. Consulte esta documentação
3. Abra um issue no repositório com detalhes do erro
4. Entre em contato com a equipe de desenvolvimento

---

*Esta implementação segue as melhores práticas recomendadas pela documentação oficial do React e padrões da indústria para tratamento de erros em aplicações modernas.*