
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { fetchInventoryAlerts } from "@/services/storeInventory/inventoryAlertService";
import type { InventoryAlert } from "@/services/storeInventory/inventoryAlertService";

interface InventoryAlertsProps {
  storeId: string;
}

export default function InventoryAlerts({ storeId }: InventoryAlertsProps) {
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAlerts = async () => {
      if (storeId) {
        setLoading(true);
        const data = await fetchInventoryAlerts(storeId);
        setAlerts(data.slice(0, 5)); // Show only first 5 alerts
        setLoading(false);
      }
    };

    loadAlerts();
  }, [storeId]);

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return 'destructive';
      case 'low_stock':
        return 'warning';
      case 'reorder_point':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Inventory Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Inventory Alerts
          {alerts.length > 0 && (
            <Badge variant="destructive">{alerts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-4">
            <Package className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">No inventory alerts</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{alert.inventory_stock?.item || 'Unknown Item'}</p>
                  <p className="text-sm text-muted-foreground">
                    {alert.current_quantity} {alert.inventory_stock?.unit || 'units'} remaining
                  </p>
                </div>
                <Badge variant={getAlertColor(alert.alert_type) as any}>
                  {alert.alert_type.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
