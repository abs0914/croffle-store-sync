
import { useState, useEffect, useCallback } from "react";
import { Product, Category } from "@/types";
import { fetchProductCatalogForPOS } from "@/services/productCatalog/productCatalogFetch";
import { fetchCategories } from "@/services/category/categoryFetch";

import { getOrCreatePOSCategories } from "@/services/pos/categoryMappingService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { prepareCategoriesForPOS } from "@/utils/categoryOrdering";

export function useProductCatalogFetch(storeId: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [isConnected, setIsConnected] = useState(true);

  const loadData = useCallback(async () => {
    try {
      console.log('🔍 useProductCatalogFetch: Starting data fetch for store:', storeId);
      
      if (!storeId) {
        console.log('🔍 useProductCatalogFetch: No storeId provided');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      console.log('🔍 useProductCatalogFetch: Fetching products and categories...');
      
      // 1) Fetch products and base categories in parallel
      const [productsData, initialCategories] = await Promise.all([
        fetchProductCatalogForPOS(storeId),
        fetchCategories(storeId).catch((err) => {
          console.warn('useProductCatalogFetch: fetchCategories failed, will fall back:', err);
          return [] as Category[];
        })
      ]);

      let categoriesData: Category[] = initialCategories || [];

      // 2) Fallback: if no categories returned from categories table, try enhanced mapping service
      if (categoriesData.length === 0) {
        categoriesData = await getOrCreatePOSCategories(storeId);
      }

      // 3) Final fallback: derive categories from products' category_ids and fetch them
      if (categoriesData.length === 0) {
        const categoryIds = Array.from(new Set((productsData || [])
          .map(p => p.category_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)));

        if (categoryIds.length > 0) {
          const { data: cats, error: catsError } = await supabase
            .from('categories')
            .select('*')
            .in('id', categoryIds)
            .eq('store_id', storeId)
            .eq('is_active', true);

          if (catsError) {
            console.warn('useProductCatalogFetch: categories query failed at final fallback:', catsError);
          } else {
            categoriesData = cats || [];
          }
        }
      }

      console.log('🔍 useProductCatalogFetch: Fetched data:', {
        productsCount: productsData.length,
        categoriesCount: categoriesData.length,
        storeId,
        sampleProducts: productsData.slice(0, 3).map(p => ({ name: p.name, category_id: p.category_id })),
        sampleCategories: categoriesData.slice(0, 5).map(c => ({ name: c.name, id: c.id, is_active: c.is_active }))
      });

      setProducts(productsData);

      // Filter and sort categories for POS display
      const preparedCategories = prepareCategoriesForPOS(categoriesData);

      setCategories(preparedCategories);
      setLastSync(new Date());
      setIsConnected(true);
    } catch (error) {
      console.error("Error loading product catalog data:", error);
      setError(error instanceof Error ? error : new Error("Failed to load data"));
      setIsConnected(false);
      toast.error("Failed to load products and categories");
    } finally {
      setIsLoading(false);
    }
  }, [storeId]);

  // Initial data load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time subscriptions for product catalog changes
  useEffect(() => {
    if (!storeId) return;

    console.log(`Setting up real-time subscription for store: ${storeId}`);

    const subscription = supabase
      .channel(`product_catalog_changes_${storeId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          console.log('Product catalog change detected:', payload);

          // Show notification for real-time updates
          if (payload.eventType === 'UPDATE') {
            toast.info('Product information updated', {
              description: 'Menu has been refreshed with latest changes'
            });
          } else if (payload.eventType === 'INSERT') {
            toast.success('New product added', {
              description: 'Menu has been updated with new item'
            });
          } else if (payload.eventType === 'DELETE') {
            toast.info('Product removed', {
              description: 'Menu has been updated'
            });
          }

          // Reload data to reflect changes
          loadData();
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Cleanup subscription on unmount
    return () => {
      console.log(`Cleaning up subscription for store: ${storeId}`);
      subscription.unsubscribe();
    };
  }, [storeId, loadData]);

  // Cache invalidation listener for management updates
  useEffect(() => {
    if (!storeId) return;

    console.log(`Setting up cache invalidation listener for store: ${storeId}`);

    const cacheInvalidationSubscription = supabase
      .channel('cache_invalidation')
      .on('broadcast',
        { event: 'product_catalog_changed' },
        (payload) => {
          console.log('Cache invalidation received:', payload);

          // Only reload if the change is for our store
          if (payload.payload.storeId === storeId) {
            toast.info('Product data updated', {
              description: 'Refreshing menu with latest changes'
            });
            loadData();
          }
        }
      )
      .subscribe();

    return () => {
      console.log(`Cleaning up cache invalidation listener for store: ${storeId}`);
      cacheInvalidationSubscription.unsubscribe();
    };
  }, [storeId, loadData]);

  return {
    products,
    categories,
    isLoading,
    error,
    lastSync,
    isConnected,
    refetch: loadData
  };
}
