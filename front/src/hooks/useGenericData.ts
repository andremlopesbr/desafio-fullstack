import { useState, useEffect, useRef, useCallback } from 'react';
import { useErrorHandler } from './useErrorHandler';

/**
 * Hook genérico para gerenciar estado de dados de API com cache e controle de loading
 * Implementa padrão de cache baseado em userId para evitar requisições desnecessárias
 * Integrado com tratamento de erros centralizado
 */
export function useGenericData<T>(
  fetcher: (userId: number) => Promise<T>,
  userId: number
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const { setError, clearError, setRetry } = useErrorHandler();

  const hasFetchedRef = useRef(false);
  const lastUserIdRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Criar novo AbortController
    abortControllerRef.current = new AbortController();

    // Verificar se já buscou dados para este usuário (cache)
    if (!force && hasFetchedRef.current && lastUserIdRef.current === userId && data) {
      return;
    }

    setLoading(true);
    clearError();

    try {
      const result = await fetcher(userId);
      setData(result);
      hasFetchedRef.current = true;
      lastUserIdRef.current = userId;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Requisição foi cancelada, ignorar erro
        return;
      }
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      const errorObj = new Error(errorMessage);

      // Usar tratamento de erros centralizado
      setError(errorObj, `Erro ao buscar dados do usuário ${userId}`);
      setRetry(() => fetchData(true));

      console.error('Erro ao buscar dados:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetcher, userId, data, setError, clearError, setRetry]);

  useEffect(() => {
    if (userId) {
      fetchData();
    }

    // Cleanup: cancelar requisição pendente quando componente for desmontado
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [userId, fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  return {
    data,
    loading,
    refetch
  };
}