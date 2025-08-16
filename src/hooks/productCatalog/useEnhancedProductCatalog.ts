import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  EnhancedProductCatalogService, 
  ProductCatalogConsistencyReport 
} from '@/services/productCatalog/enhancedProductCatalogService';
import { toast } from 'sonner';

export function useEnhancedProductCatalog(storeId: string | null) {
  const [consistencyReport, setConsistencyReport] = useState<ProductCatalogConsistencyReport | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Fetch products with enhanced availability checking
  const { 
    data: products = [], 
    isLoading, 
    error,
    refetch
  } = useQuery({
    queryKey: ['enhanced-product-catalog', storeId],
    queryFn: () => storeId ? EnhancedProductCatalogService.fetchProductsWithAvailability(storeId) : Promise.resolve([]),
    enabled: !!storeId,
    staleTime: 30000, // 30 seconds
  });

  // Validate catalog consistency
  const validateConsistency = useCallback(async () => {
    setIsValidating(true);
    try {
      const report = await EnhancedProductCatalogService.validateConsistency();
      setConsistencyReport(report);
      setLastValidation(new Date());
      
      if (report.totalIssues > 0) {
        toast.warning(`Found ${report.totalIssues} consistency issues in product catalog`);
      } else {
        toast.success('Product catalog is consistent');
      }
    } catch (error) {
      console.error('Validation failed:', error);
      toast.error('Failed to validate product catalog');
    } finally {
      setIsValidating(false);
    }
  }, []);

  // Update product mutation with validation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      EnhancedProductCatalogService.updateProductWithValidation(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-catalog'] });
    },
  });

  // Create product mutation with validation
  const createProductMutation = useMutation({
    mutationFn: ({ productData, ingredients }: { productData: any; ingredients?: any[] }) =>
      EnhancedProductCatalogService.createProductWithValidation(productData, ingredients),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-catalog'] });
    },
  });

  // Sync catalog with products table
  const syncMutation = useMutation({
    mutationFn: () => storeId ? EnhancedProductCatalogService.syncCatalogWithProducts(storeId) : Promise.reject('No store ID'),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['enhanced-product-catalog'] });
      toast.success(`Synced ${result.synced} products. ${result.errors.length} errors.`);
    },
    onError: (error) => {
      console.error('Sync failed:', error);
      toast.error('Failed to sync product catalog');
    }
  });

  // Real-time subscription for product catalog changes
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('product_catalog_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('Product catalog change detected:', payload);
          
          // Invalidate queries to refetch data
          queryClient.invalidateQueries({ queryKey: ['enhanced-product-catalog'] });
          
          // Show notification for changes
          if (payload.eventType === 'INSERT') {
            toast.info('New product added to catalog');
          } else if (payload.eventType === 'UPDATE') {
            toast.info('Product catalog updated');
          } else if (payload.eventType === 'DELETE') {
            toast.info('Product removed from catalog');
          }
        }
      )
      .subscribe();

    // Listen for broadcast events (cache invalidation)
    const broadcastChannel = supabase
      .channel('product_catalog_changes')
      .on('broadcast', { event: 'product_catalog_changed' }, (payload) => {
        console.log('Broadcast change detected:', payload);
        queryClient.invalidateQueries({ queryKey: ['enhanced-product-catalog'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(broadcastChannel);
    };
  }, [storeId, queryClient]);

  // Auto-validate on mount and periodically
  useEffect(() => {
    validateConsistency();
    
    // Validate every 5 minutes
    const interval = setInterval(validateConsistency, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [validateConsistency]);

  return {
    // Data
    products,
    consistencyReport,
    lastValidation,
    
    // States
    isLoading,
    isValidating,
    error,
    
    // Actions
    validateConsistency,
    refetch,
    updateProduct: updateProductMutation.mutate,
    createProduct: createProductMutation.mutate,
    syncCatalog: syncMutation.mutate,
    
    // Mutation states
    isUpdating: updateProductMutation.isPending,
    isCreating: createProductMutation.isPending,
    isSyncing: syncMutation.isPending,
  };
}