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
    if (!products.length || !storeId) return;

    setIsLoading(true);
    console.log('🧹 POS Inventory Context: Clearing inventory status map for fresh calculation');
    console.log('🔍 POS Inventory Context: Processing', products.length, 'products for store', storeId);
    
    // Debug: Log first few products to see their structure
    console.log('📋 POS Inventory Context: First 3 products structure:', products.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      recipe_id: p.recipe_id,
      product_type: (p as any).product_type,
      stock_quantity: p.stock_quantity,
      is_available: p.is_available
    })));
    
    setInventoryStatusMap(new Map()); // Clear existing status
    
    try {
      const statusMap = await fetchPOSInventoryStatus(products, storeId);
      setInventoryStatusMap(statusMap);
      console.log('✅ POS Inventory Context: Status updated for', statusMap.size, 'products');
      
      // Log the status results for debugging
      const statusEntries = Array.from(statusMap.entries());
      console.log('📊 POS Inventory Context: Status results:', statusEntries.slice(0, 5).map(([id, status]) => ({
        productId: id,
        status: status.status,
        availableQuantity: status.availableQuantity,
        isDirectProduct: status.isDirectProduct
      })));
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