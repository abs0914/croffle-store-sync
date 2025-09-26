import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Product } from '@/types';
import { fetchPOSInventoryStatus, POSInventoryStatus } from '@/services/pos/posInventoryIntegrationService';

interface POSInventoryContextType {
  inventoryStatusMap: Map<string, POSInventoryStatus>;
  isLoading: boolean;
  refreshInventoryStatus: () => Promise<void>;
  getProductStatus: (productId: string) => POSInventoryStatus | undefined;
}

const POSInventoryContext = createContext<POSInventoryContextType | undefined>(undefined);

interface POSInventoryProviderProps {
  children: React.ReactNode;
  products: Product[];
  storeId: string;
}

export const POSInventoryProvider: React.FC<POSInventoryProviderProps> = ({
  children,
  products,
  storeId
}) => {
  const [inventoryStatusMap, setInventoryStatusMap] = useState<Map<string, POSInventoryStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  const refreshInventoryStatus = useCallback(async () => {
    if (!products.length || !storeId) {
      console.log('⏭️ POS Inventory Context: Skipping refresh - no products or store ID', { 
        productsLength: products.length, 
        storeId 
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔄 POS Inventory Context: Refreshing status for', products.length, 'products in store:', storeId);
      console.log('📦 Sample products:', products.slice(0, 3).map(p => ({ id: p.id, name: p.name })));
      
      const statusMap = await fetchPOSInventoryStatus(products, storeId);
      setInventoryStatusMap(statusMap);
      console.log('✅ POS Inventory Context: Status updated for', statusMap.size, 'products');
      
      // Log first few status entries for debugging
      const statusEntries = Array.from(statusMap.entries()).slice(0, 3);
      console.log('📊 Sample status entries:', statusEntries);
    } catch (error) {
      console.error('❌ POS Inventory Context: Failed to refresh inventory status:', error);
    } finally {
      setIsLoading(false);
    }
  }, [products, storeId]);

  // Initial fetch when products or storeId changes
  useEffect(() => {
    refreshInventoryStatus();
  }, [refreshInventoryStatus]);

  const getProductStatus = useCallback((productId: string): POSInventoryStatus | undefined => {
    return inventoryStatusMap.get(productId);
  }, [inventoryStatusMap]);

  const value: POSInventoryContextType = {
    inventoryStatusMap,
    isLoading,
    refreshInventoryStatus,
    getProductStatus
  };

  return (
    <POSInventoryContext.Provider value={value}>
      {children}
    </POSInventoryContext.Provider>
  );
};

export const usePOSInventory = (): POSInventoryContextType => {
  const context = useContext(POSInventoryContext);
  if (!context) {
    throw new Error('usePOSInventory must be used within a POSInventoryProvider');
  }
  return context;
};