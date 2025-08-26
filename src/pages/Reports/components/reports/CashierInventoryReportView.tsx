import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Package, 
  TrendingDown, 
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { useStore } from "@/contexts/StoreContext";
import { useAuth } from "@/contexts/auth";
import { 
  fetchCashierInventoryStatus, 
  acknowledgeInventoryAlert,
  InventoryAlert 
} from "@/services/reports/cashierInventoryService";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";
import { toast } from "sonner";

export default function CashierInventoryReportView() {
  const { currentStore } = useStore();
  const { user } = useAuth();
  const [selectedDate] = useState<Date>(new Date());

  const { 
    data: inventoryData, 
    isLoading, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ["cashier-inventory-status", currentStore?.id, user?.id, selectedDate],
    queryFn: () => {
      if (!currentStore?.id) return null;
      return fetchCashierInventoryStatus(currentStore.id, user?.id, selectedDate);
    },
    enabled: !!currentStore?.id,
    refetchInterval: 60000, // Refresh every minute
  });

  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await acknowledgeInventoryAlert(alertId);
      toast.success("Alert acknowledged");
      refetch();
    } catch (error) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'low_stock':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'reorder_point':
        return <TrendingDown className="h-4 w-4 text-orange-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertVariant = (alertType: string) => {
    switch (alertType) {
      case 'out_of_stock':
        return 'destructive' as const;
      case 'low_stock':
        return 'secondary' as const;
      case 'reorder_point':
        return 'outline' as const;
      default:
        return 'outline' as const;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-24 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load inventory status. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!inventoryData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Inventory Data</h3>
          <p className="text-muted-foreground">
            Unable to load inventory information.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { alerts, movements, currentStockLevels, soldItems } = inventoryData;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inventory Status</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-red-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Inventory Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getAlertIcon(alert.alertType)}
                    <div>
                      <p className="font-medium">{alert.item}</p>
                      <p className="text-sm text-muted-foreground">
                        Current: {alert.currentStock} {alert.unit}
                        {alert.minimumThreshold && ` • Minimum: ${alert.minimumThreshold} ${alert.unit}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={getAlertVariant(alert.alertType)}>
                      {alert.alertType.replace('_', ' ').toUpperCase()}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAcknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {alerts.length === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            No inventory alerts at this time. All stock levels are adequate.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{currentStockLevels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingDown className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Items Sold Today</p>
                <p className="text-2xl font-bold">{soldItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Active Alerts</p>
                <p className="text-2xl font-bold">{alerts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Stock Levels */}
      <Card>
        <CardHeader>
          <CardTitle>Current Stock Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {currentStockLevels.slice(0, 10).map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{item.currentStock} {item.unit}</p>
                  {item.cost && (
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.cost)} per {item.unit}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {currentStockLevels.length > 10 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                ... and {currentStockLevels.length - 10} more items
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items Sold Today */}
      {soldItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items Sold Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {soldItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{item.item}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{item.quantitySold} units</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(item.totalValue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Inventory Movements */}
      {movements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Inventory Movements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {movements.slice(0, 5).map((movement) => (
                <div key={movement.id} className="flex items-center justify-between p-2 border rounded text-sm">
                  <div>
                    <p className="font-medium">{movement.item}</p>
                    <p className="text-muted-foreground">
                      {movement.transactionType.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {movement.transactionType.includes('in') || movement.transactionType.includes('adjustment') ? '+' : '-'}
                      {movement.quantity} {movement.unit}
                    </p>
                    <p className="text-muted-foreground">
                      {format(new Date(movement.timestamp), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}