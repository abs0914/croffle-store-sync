
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';
import { InventoryItem } from '@/types/inventoryManagement';

interface OptimizedInventoryStats {
  totalItems: number;
  healthyItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

export function useOptimizedInventory(storeId?: string) {
  const { currentStore } = useStore();
  const activeStoreId = storeId || currentStore?.id;

  // Fetch real inventory stock data
  const { data: inventoryItems = [], isLoading, error } = useQuery({
    queryKey: ['optimized-inventory', activeStoreId],
    queryFn: async () => {
      if (!activeStoreId) return [];
      
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', activeStoreId)
        .eq('is_active', true)
        .order('item', { ascending: true });

      if (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }

      // Transform to InventoryItem format
      return (data || []).map(item => ({
        id: item.id,
        name: item.item,
        sku: item.sku || '',
        category: 'General', // Default category since not in inventory_stock
        current_stock: item.stock_quantity,
        minimum_threshold: item.minimum_threshold || 10,
        maximum_capacity: item.maximum_capacity || 1000,
        unit: item.unit,
        unit_cost: item.cost || 0,
        last_restocked: item.last_restocked,
        store_id: item.store_id,
        is_active: item.is_active,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) as InventoryItem[];
    },
    enabled: !!activeStoreId
  });

  // Compute real-time statistics
  const computedStats = useMemo((): OptimizedInventoryStats => {
    if (!inventoryItems.length) {
      return {
        totalItems: 0,
        healthyItems: 0,
        lowStockItems: 0,
        outOfStockItems: 0,
        totalValue: 0
      };
    }

    const stats = inventoryItems.reduce((acc, item) => {
      const isOutOfStock = item.current_stock <= 0;
      const isLowStock = item.current_stock <= (item.minimum_threshold || 10) && !isOutOfStock;
      const itemValue = (item.current_stock || 0) * (item.unit_cost || 0);

      return {
        totalItems: acc.totalItems + 1,
        outOfStockItems: acc.outOfStockItems + (isOutOfStock ? 1 : 0),
        lowStockItems: acc.lowStockItems + (isLowStock ? 1 : 0),
        healthyItems: acc.healthyItems + (!isOutOfStock && !isLowStock ? 1 : 0),
        totalValue: acc.totalValue + itemValue
      };
    }, {
      totalItems: 0,
      healthyItems: 0,
      lowStockItems: 0,
      outOfStockItems: 0,
      totalValue: 0
    });

    return stats;
  }, [inventoryItems]);

  // Optimized filtering function
  const createOptimizedFilter = useCallback((searchTerm: string, categoryFilter: string) => {
    if (!inventoryItems.length) return [];

    return inventoryItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
        
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [inventoryItems]);

  return {
    inventoryItems,
    isLoading,
    error,
    computedStats,
    createOptimizedFilter,
    activeStoreId
  };
}
