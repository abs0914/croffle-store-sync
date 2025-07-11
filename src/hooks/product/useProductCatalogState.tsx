import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  fetchProductCatalog, 
  updateProduct, 
  toggleProductAvailability, 
  updateProductStatus 
} from '@/services/productCatalog/productCatalogService';
import { ProductCatalog, ProductStatus } from '@/services/productCatalog/types';
import { toast } from 'sonner';
import { useEffect } from 'react';

export function useProductCatalogState(storeId: string) {
  const queryClient = useQueryClient();
  const queryKey = ['product-catalog', storeId];

  // Optimized data fetching with React Query
  const {
    data: products = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey,
    queryFn: () => fetchProductCatalog(storeId),
    enabled: !!storeId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Real-time subscription
  useEffect(() => {
    if (!storeId) return;

    console.log(`🔄 Setting up real-time subscription for product catalog in store: ${storeId}`);

    const channel = supabase
      .channel(`product_catalog_realtime_${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'product_catalog',
        filter: `store_id=eq.${storeId}`
      }, (payload) => {
        console.log('📡 Product catalog real-time update received:', payload);
        
        // Invalidate and refetch data
        queryClient.invalidateQueries({ queryKey });
        
        // Show appropriate notification
        if (payload.eventType === 'UPDATE') {
          toast.info('Product updated', {
            description: 'Product catalog has been refreshed with latest changes'
          });
        } else if (payload.eventType === 'INSERT') {
          toast.success('New product added', {
            description: 'A new product has been added to the catalog'
          });
        } else if (payload.eventType === 'DELETE') {
          toast.info('Product removed', {
            description: 'A product has been removed from the catalog'
          });
        }
      })
      .subscribe((status) => {
        console.log('📡 Product catalog subscription status:', status);
      });

    return () => {
      console.log(`🔄 Cleaning up product catalog subscription for store: ${storeId}`);
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // Cache invalidation listener for manual updates
  useEffect(() => {
    if (!storeId) return;

    console.log(`🔄 Setting up cache invalidation listener for store: ${storeId}`);

    const cacheChannel = supabase
      .channel('product_catalog_cache_invalidation')
      .on('broadcast', { event: 'product_catalog_changed' }, (payload) => {
        console.log('📡 Cache invalidation broadcast received:', payload);
        
        if (payload.payload.storeId === storeId) {
          console.log('📡 Cache invalidation matches current store, refreshing...');
          queryClient.invalidateQueries({ queryKey });
        }
      })
      .subscribe();

    return () => {
      console.log(`🔄 Cleaning up cache invalidation listener for store: ${storeId}`);
      supabase.removeChannel(cacheChannel);
    };
  }, [storeId, queryClient]);

  // Optimistic update mutations
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ProductCatalog> }) => {
      console.log(`🔄 Updating product ${id} with:`, updates);
      const success = await updateProduct(id, updates);
      if (!success) throw new Error('Failed to update product');
      return { id, updates };
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousProducts = queryClient.getQueryData<ProductCatalog[]>(queryKey);

      // Optimistically update cache
      queryClient.setQueryData<ProductCatalog[]>(queryKey, (old = []) =>
        old.map(product =>
          product.id === id ? { ...product, ...updates } : product
        )
      );

      return { previousProducts };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(queryKey, context.previousProducts);
      }
      console.error('❌ Product update failed:', error);
      toast.error('Failed to update product');
    },
    onSuccess: (data) => {
      console.log('✅ Product updated successfully');
      toast.success('Product updated successfully');
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ id, isAvailable }: { id: string; isAvailable: boolean }) => {
      console.log(`🔄 Toggling availability for product ${id} to:`, isAvailable);
      const success = await toggleProductAvailability(id, isAvailable);
      if (!success) throw new Error('Failed to toggle product availability');
      return { id, isAvailable };
    },
    onMutate: async ({ id, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousProducts = queryClient.getQueryData<ProductCatalog[]>(queryKey);

      queryClient.setQueryData<ProductCatalog[]>(queryKey, (old = []) =>
        old.map(product =>
          product.id === id ? { ...product, is_available: isAvailable } : product
        )
      );

      return { previousProducts };
    },
    onError: (error, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(queryKey, context.previousProducts);
      }
      console.error('❌ Toggle availability failed:', error);
      toast.error('Failed to update product availability');
    },
    onSuccess: (data) => {
      console.log('✅ Product availability toggled successfully');
      toast.success(`Product ${data.isAvailable ? 'activated' : 'deactivated'} successfully`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, isAvailable }: { id: string; status: ProductStatus; isAvailable: boolean }) => {
      console.log(`🔄 Updating status for product ${id} to:`, status, 'available:', isAvailable);
      const success = await updateProductStatus(id, status, isAvailable);
      if (!success) throw new Error('Failed to update product status');
      return { id, status, isAvailable };
    },
    onMutate: async ({ id, status, isAvailable }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousProducts = queryClient.getQueryData<ProductCatalog[]>(queryKey);

      queryClient.setQueryData<ProductCatalog[]>(queryKey, (old = []) =>
        old.map(product =>
          product.id === id ? { ...product, product_status: status, is_available: isAvailable } : product
        )
      );

      return { previousProducts };
    },
    onError: (error, variables, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(queryKey, context.previousProducts);
      }
      console.error('❌ Status update failed:', error);
      toast.error('Failed to update product status');
    },
    onSuccess: (data) => {
      console.log('✅ Product status updated successfully');
      const statusLabels = {
        available: 'available',
        out_of_stock: 'out of stock',
        temporarily_unavailable: 'temporarily unavailable',
        discontinued: 'discontinued'
      };
      toast.success(`Product marked as ${statusLabels[data.status]}`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    }
  });

  return {
    // Data
    products,
    isLoading,
    error,
    refetch,
    
    // Actions
    updateProduct: updateProductMutation.mutate,
    toggleAvailability: toggleAvailabilityMutation.mutate,
    updateStatus: updateStatusMutation.mutate,
    
    // Loading states
    isUpdating: updateProductMutation.isPending,
    isTogglingAvailability: toggleAvailabilityMutation.isPending,
    isUpdatingStatus: updateStatusMutation.isPending
  };
}