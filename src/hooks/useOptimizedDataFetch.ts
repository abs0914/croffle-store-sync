
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface CacheConfig {
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
}

interface OptimizedFetchOptions {
  enabled?: boolean;
  dependencies?: any[];
  cacheConfig?: CacheConfig;
  debounceMs?: number;
}

export function useOptimizedDataFetch<T>(
  queryKey: (string | number)[],
  queryFn: () => Promise<T>,
  options: OptimizedFetchOptions = {}
) {
  const {
    enabled = true,
    dependencies = [],
    cacheConfig = {},
    debounceMs = 300
  } = options;

  const debounceRef = useRef<NodeJS.Timeout>();
  const [debouncedEnabled, setDebouncedEnabled] = useState(enabled);

  // Debounce enabled state changes to prevent excessive refetches
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setDebouncedEnabled(enabled);
    }, debounceMs);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, debounceMs]);

  const defaultCacheConfig: CacheConfig = {
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    ...cacheConfig
  };

  return useQuery({
    queryKey: [...queryKey, ...dependencies],
    queryFn,
    enabled: debouncedEnabled,
    staleTime: defaultCacheConfig.staleTime,
    gcTime: defaultCacheConfig.cacheTime,
    refetchOnWindowFocus: defaultCacheConfig.refetchOnWindowFocus,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}

export function useOptimizedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V) => void;
    invalidateQueries?: string[][];
  } = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError, invalidateQueries = [] } = options;

  const optimizedMutationFn = useCallback(async (variables: V) => {
    try {
      const result = await mutationFn(variables);
      
      // Invalidate related queries
      invalidateQueries.forEach(queryKey => {
        queryClient.invalidateQueries({ queryKey });
      });
      
      if (onSuccess) {
        onSuccess(result, variables);
      }
      
      return result;
    } catch (error) {
      if (onError) {
        onError(error as Error, variables);
      }
      throw error;
    }
  }, [mutationFn, onSuccess, onError, invalidateQueries, queryClient]);

  return { mutate: optimizedMutationFn };
}
