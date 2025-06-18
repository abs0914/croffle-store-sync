
import React, { useEffect, useState } from 'react';
import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getInventoryStatus } from '@/services/productCatalog/inventoryIntegrationService';
import { useStore } from '@/contexts/StoreContext';

interface InventoryStatus {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  healthyItems: number;
}

export const InventoryStatusIndicator: React.FC = () => {
  const { currentStore } = useStore();
  const [status, setStatus] = useState<InventoryStatus>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    healthyItems: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!currentStore?.id) return;
      
      setIsLoading(true);
      try {
        const inventoryStatus = await getInventoryStatus(currentStore.id);
        setStatus(inventoryStatus);
      } catch (error) {
        console.error('Error fetching inventory status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [currentStore?.id]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    );
  }

  const getStatusColor = () => {
    if (status.outOfStockItems > 0) return 'destructive';
    if (status.lowStockItems > 0) return 'secondary';
    return 'default';
  };

  const getStatusIcon = () => {
    if (status.outOfStockItems > 0) return <AlertTriangle className="h-3 w-3" />;
    if (status.lowStockItems > 0) return <TrendingDown className="h-3 w-3" />;
    return <TrendingUp className="h-3 w-3" />;
  };

  const getStatusText = () => {
    if (status.outOfStockItems > 0) {
      return `${status.outOfStockItems} out of stock`;
    }
    if (status.lowStockItems > 0) {
      return `${status.lowStockItems} low stock`;
    }
    return 'Inventory healthy';
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusColor()} className="flex items-center gap-1">
        {getStatusIcon()}
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
      <span className="text-xs text-muted-foreground">
        {status.totalItems} total items
      </span>
    </div>
  );
};
