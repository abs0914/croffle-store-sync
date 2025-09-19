import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Package, TrendingDown, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedInventoryAlertsProps {
  storeId: string;
}

interface InventoryItem {
  id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  minimum_threshold: number;
  cost: number;
  item_category: string;
}

export default function EnhancedInventoryAlerts({ storeId }: EnhancedInventoryAlertsProps) {
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchInventoryAlerts = async () => {
      if (!storeId) return;

      try {
        // Get items that are low stock or out of stock
        const { data, error } = await supabase
          .from('inventory_stock')
          .select('id, item, unit, stock_quantity, minimum_threshold, cost, item_category')
          .eq('store_id', storeId)
          .eq('is_active', true)
          .filter('stock_quantity', 'lte', 10)
          .order('stock_quantity', { ascending: true });

        if (error) throw error;
        
        // Filter items that are actually low stock or out of stock
        const filteredAlerts = (data || []).filter(item => 
          item.stock_quantity === 0 || item.stock_quantity <= (item.minimum_threshold || 10)
        );
        
        setAlerts(filteredAlerts);
      } catch (error) {
        console.error('Error fetching inventory alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryAlerts();
  }, [storeId]);

  const getAlertSeverity = (item: InventoryItem) => {
    if (item.stock_quantity === 0) return 'critical';
    if (item.stock_quantity <= (item.minimum_threshold || 10) * 0.5) return 'high';
    return 'medium';
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      default: return 'secondary';
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return AlertCircle;
      case 'high': return AlertTriangle;
      case 'medium': return TrendingDown;
      default: return Package;
    }
  };

  const displayedAlerts = showAll ? alerts : alerts.slice(0, 5);
  const criticalCount = alerts.filter(item => item.stock_quantity === 0).length;
  const lowStockCount = alerts.filter(item => item.stock_quantity > 0).length;

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
          <p className="text-muted-foreground">Loading inventory alerts...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Inventory Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive">{alerts.length}</Badge>
            )}
          </div>
          {alerts.length > 5 && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowAll(!showAll)}
            >
              {showAll ? 'Show Less' : `View All (${alerts.length})`}
            </Button>
          )}
        </CardTitle>
        {alerts.length > 0 && (
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-red-500" />
              {criticalCount} Out of Stock
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-orange-500" />
              {lowStockCount} Low Stock
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">All inventory levels are healthy!</p>
            <p className="text-sm text-muted-foreground">No items require immediate attention</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedAlerts.map((item) => {
              const severity = getAlertSeverity(item);
              const AlertIcon = getAlertIcon(severity);
              
              return (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <AlertIcon className={`h-4 w-4 ${
                      severity === 'critical' ? 'text-red-500' :
                      severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                    }`} />
                    <div>
                      <p className="font-medium">{item.item}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.stock_quantity === 0 ? (
                          <span className="text-red-600 font-medium">Out of stock</span>
                        ) : (
                          <>
                            {item.stock_quantity} {item.unit} remaining
                            <span className="text-muted-foreground ml-1">
                              (Min: {item.minimum_threshold || 10})
                            </span>
                          </>
                        )}
                      </p>
                      {item.item_category && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {item.item_category.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={getAlertColor(severity) as any}>
                    {severity === 'critical' ? 'Critical' : 
                     severity === 'high' ? 'High' : 'Low Stock'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}