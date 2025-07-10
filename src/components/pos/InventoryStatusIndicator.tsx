
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
// Simple mock service for POS inventory status
const getPOSInventoryStatus = async (storeId: string) => {
  return {
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    healthyItems: 0
  };
};
import { useStore } from '@/contexts/StoreContext';

interface InventoryStatus {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  healthyItems: number;
}

export const InventoryStatusIndicator: React.FC = () => {
  const { currentStore } = useStore();
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    healthyItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInventoryStatus = async () => {
      if (!currentStore?.id) return;
      
      setIsLoading(true);
      try {
        const status = await getPOSInventoryStatus(currentStore.id);
        setInventoryStatus(status);
      } catch (error) {
        console.error('Error fetching inventory status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInventoryStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchInventoryStatus, 30000);
    return () => clearInterval(interval);
  }, [currentStore?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-sm text-gray-500">
        <Package className="h-4 w-4" />
        <span>Loading inventory...</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (inventoryStatus.outOfStockItems > 0) return 'destructive';
    if (inventoryStatus.lowStockItems > 5) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (inventoryStatus.outOfStockItems > 0) return <AlertTriangle className="h-4 w-4" />;
    if (inventoryStatus.lowStockItems > 0) return <TrendingDown className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  return (
    <div className="flex items-center space-x-3 text-sm">
      <div className="flex items-center space-x-1">
        <Package className="h-4 w-4 text-gray-500" />
        <span className="text-gray-600">{inventoryStatus.totalItems} items</span>
      </div>
      
      {inventoryStatus.lowStockItems > 0 && (
        <Badge variant="secondary" className="flex items-center space-x-1">
          <TrendingDown className="h-3 w-3" />
          <span>{inventoryStatus.lowStockItems} low</span>
        </Badge>
      )}
      
      {inventoryStatus.outOfStockItems > 0 && (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertTriangle className="h-3 w-3" />
          <span>{inventoryStatus.outOfStockItems} out</span>
        </Badge>
      )}
      
      {inventoryStatus.outOfStockItems === 0 && inventoryStatus.lowStockItems === 0 && (
        <Badge variant="default" className="flex items-center space-x-1">
          <TrendingUp className="h-3 w-3" />
          <span>Healthy</span>
        </Badge>
      )}
    </div>
  );
};
