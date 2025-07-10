import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign,
  Activity
} from 'lucide-react';
import { useEnhancedPOSInventory } from '@/hooks/pos/useEnhancedPOSInventory';

interface EnhancedPOSInventoryWidgetProps {
  storeId: string;
}

export const EnhancedPOSInventoryWidget: React.FC<EnhancedPOSInventoryWidgetProps> = ({
  storeId
}) => {
  const { 
    inventoryStatus, 
    isLoading, 
    realTimeEnabled,
    refreshInventoryStatus 
  } = useEnhancedPOSInventory(storeId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 animate-spin" />
            Loading Inventory...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStockStatusColor = () => {
    if (inventoryStatus.outOfStockItems > 0) return 'border-red-500 bg-red-50';
    if (inventoryStatus.lowStockItems > 5) return 'border-yellow-500 bg-yellow-50';
    return 'border-green-500 bg-green-50';
  };

  const getStockStatusIcon = () => {
    if (inventoryStatus.outOfStockItems > 0) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    if (inventoryStatus.lowStockItems > 5) return <TrendingDown className="h-5 w-5 text-yellow-600" />;
    return <CheckCircle2 className="h-5 w-5 text-green-600" />;
  };

  return (
    <Card className={`relative ${getStockStatusColor()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStockStatusIcon()}
            <span>Enhanced Inventory Status</span>
          </div>
          <div className="flex items-center gap-2">
            {inventoryStatus.supportsFractional && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Fractional
              </Badge>
            )}
            {realTimeEnabled && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <Activity className="h-3 w-3 mr-1" />
                Live
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Real-time Status */}
        {realTimeEnabled && (
          <Alert className="border-green-200 bg-green-50">
            <Activity className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Real-time inventory updates active - fractional deductions supported
            </AlertDescription>
          </Alert>
        )}

        {/* Inventory Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {inventoryStatus.healthyItems}
            </div>
            <div className="text-sm text-muted-foreground">Healthy Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {inventoryStatus.lowStockItems}
            </div>
            <div className="text-sm text-muted-foreground">Low Stock</div>
          </div>
        </div>

        {/* Critical Alerts */}
        {inventoryStatus.outOfStockItems > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>{inventoryStatus.outOfStockItems}</strong> items are out of stock
            </AlertDescription>
          </Alert>
        )}

        {/* Inventory Value */}
        <div className="p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Inventory Value</span>
            </div>
            <span className="font-bold">₱{inventoryStatus.totalValue.toFixed(2)}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Total Items:</span>
            <span>{inventoryStatus.totalItems}</span>
          </div>
          <div className="flex justify-between">
            <span>Stock Health:</span>
            <span>
              {inventoryStatus.totalItems > 0 
                ? Math.round((inventoryStatus.healthyItems / inventoryStatus.totalItems) * 100)
                : 0}%
            </span>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={refreshInventoryStatus}
          className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Click to refresh • Last updated: {new Date().toLocaleTimeString()}
        </button>
      </CardContent>
    </Card>
  );
};