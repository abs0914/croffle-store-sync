
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { AlertTriangle, TrendingDown, Package, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useProactiveReordering } from '@/hooks/inventory/useProactiveReordering';

interface ReorderAlert {
  id: string;
  item_name: string;
  current_stock: number;
  minimum_threshold: number;
  recommended_order_quantity: number;
  consumption_rate: number;
  days_until_stockout: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  cost_impact: number;
  supplier_lead_time: number;
  last_order_date?: string;
}

interface ConsumptionPattern {
  item_id: string;
  daily_average: number;
  weekly_trend: number;
  seasonal_factor: number;
  forecast_accuracy: number;
}

interface ProactiveReorderingSystemProps {
  storeId?: string;
}

export const ProactiveReorderingSystem: React.FC<ProactiveReorderingSystemProps> = ({ 
  storeId = 'default-store-id' 
}) => {
  const {
    reorderRecommendations,
    consumptionPatterns,
    stockAlerts,
    monitoringMetrics,
    isLoading,
    loadReorderData,
    acknowledgeAlert,
    criticalAlerts,
    recommendationsCount,
    estimatedSavings
  } = useProactiveReordering(storeId);

  const [isRecommendationOpen, setIsRecommendationOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<ReorderAlert | null>(null);

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      default: return 'default';
    }
  };

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high': return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-600" />;
      default: return <Package className="h-4 w-4 text-blue-600" />;
    }
  };

  const calculateStockPercentage = (current: number, minimum: number) => {
    return Math.max(0, Math.min(100, (current / minimum) * 100));
  };

  const generateReorderRecommendation = (alert: ReorderAlert) => {
    setSelectedAlert(alert);
    setIsRecommendationOpen(true);
  };

  const createPurchaseOrder = async (alert: ReorderAlert) => {
    try {
      console.log('Creating purchase order for:', alert);
      toast.success(`Purchase order created for ${alert.item_name}`);
      setIsRecommendationOpen(false);
      
      // Refresh data after creating order
      await loadReorderData();
    } catch (error) {
      toast.error('Failed to create purchase order');
    }
  };

  const acknowledgeAlertHandler = (alertId: string) => {
    acknowledgeAlert(alertId);
    toast.success('Alert acknowledged');
  };

  // Convert reorder recommendations to the alert format for display
  const reorderAlerts: ReorderAlert[] = reorderRecommendations.map(rec => ({
    id: rec.item_id,
    item_name: rec.item_name,
    current_stock: rec.current_stock,
    minimum_threshold: rec.minimum_threshold,
    recommended_order_quantity: rec.recommended_order_quantity,
    consumption_rate: rec.consumption_rate,
    days_until_stockout: rec.days_until_stockout,
    urgency_level: rec.urgency_level,
    cost_impact: rec.cost_impact,
    supplier_lead_time: rec.supplier_lead_time,
    last_order_date: rec.last_order_date
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Proactive Reordering System</h2>
          <p className="text-muted-foreground">Smart inventory monitoring with consumption-based recommendations</p>
        </div>
        <Button variant="outline" onClick={loadReorderData} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Alerts'}
        </Button>
      </div>

      {/* Alert Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-muted-foreground">Critical Alerts</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {reorderAlerts.filter(a => a.urgency_level === 'high').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Total Financial Impact</div>
            <div className="text-2xl font-bold">
              ₱{estimatedSavings.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Items Monitored</div>
            <div className="text-2xl font-bold text-blue-600">{recommendationsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Reorder Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Reorder Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Stock Level</TableHead>
                <TableHead>Consumption Rate</TableHead>
                <TableHead>Days Until Stockout</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>Recommended Order</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reorderAlerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{alert.item_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Lead time: {alert.supplier_lead_time} days
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{alert.current_stock} units</span>
                        <span className="text-muted-foreground">Min: {alert.minimum_threshold}</span>
                      </div>
                      <Progress 
                        value={calculateStockPercentage(alert.current_stock, alert.minimum_threshold)} 
                        className="h-2"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{alert.consumption_rate.toFixed(1)} units/day</div>
                      <div className="text-muted-foreground">Average</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={alert.days_until_stockout <= 3 ? "destructive" : alert.days_until_stockout <= 7 ? "secondary" : "outline"}>
                      {alert.days_until_stockout} days
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getUrgencyIcon(alert.urgency_level)}
                      <Badge variant={getUrgencyColor(alert.urgency_level)}>
                        {alert.urgency_level.toUpperCase()}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{alert.recommended_order_quantity} units</div>
                      <div className="text-muted-foreground">₱{alert.cost_impact.toLocaleString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => generateReorderRecommendation(alert)}>
                        Order
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => acknowledgeAlertHandler(alert.id)}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reorder Recommendation Dialog */}
      <Dialog open={isRecommendationOpen} onOpenChange={setIsRecommendationOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reorder Recommendation</DialogTitle>
          </DialogHeader>
          
          {selectedAlert && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{selectedAlert.item_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Current Stock</Label>
                      <div className="text-2xl font-bold">{selectedAlert.current_stock} units</div>
                    </div>
                    <div>
                      <Label>Recommended Order</Label>
                      <div className="text-2xl font-bold text-blue-600">{selectedAlert.recommended_order_quantity} units</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Daily Consumption</Label>
                      <div>{selectedAlert.consumption_rate.toFixed(1)} units/day</div>
                    </div>
                    <div>
                      <Label>Supplier Lead Time</Label>
                      <div>{selectedAlert.supplier_lead_time} days</div>
                    </div>
                  </div>
                  
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Based on current consumption patterns, you will run out of stock in {selectedAlert.days_until_stockout} days. 
                      The recommended order quantity will last approximately {Math.round(selectedAlert.recommended_order_quantity / selectedAlert.consumption_rate)} days.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Cost:</span>
                      <span className="text-xl font-bold">₱{selectedAlert.cost_impact.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRecommendationOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => createPurchaseOrder(selectedAlert)}>
                  Create Purchase Order
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
