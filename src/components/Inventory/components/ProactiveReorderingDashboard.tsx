
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  Bell, 
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3
} from 'lucide-react';
import { useProactiveReordering } from '@/hooks/inventory/useProactiveReordering';
import { ProactiveReorderingSystem } from './ProactiveReorderingSystem';

interface ProactiveReorderingDashboardProps {
  storeId: string;
}

export const ProactiveReorderingDashboard: React.FC<ProactiveReorderingDashboardProps> = ({
  storeId
}) => {
  const {
    reorderRecommendations,
    consumptionPatterns,
    stockAlerts,
    monitoringMetrics,
    notifications,
    salesConsumption,
    isLoading,
    error,
    loadReorderData,
    acknowledgeAlert,
    dismissNotification,
    markNotificationAsRead,
    topConsumingItems,
    criticalItems,
    unreadNotifications,
    totalAlerts,
    criticalAlerts,
    recommendationsCount,
    estimatedSavings
  } = useProactiveReordering(storeId);

  const [activeTab, setActiveTab] = useState('overview');

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Proactive Reordering System</h2>
          <p className="text-muted-foreground">
            AI-powered inventory management with consumption-based predictions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadReorderData} disabled={isLoading}>
            {isLoading ? 'Refreshing...' : 'Refresh Data'}
          </Button>
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive" className="relative">
              <Bell className="h-4 w-4 mr-1" />
              {unreadNotifications.length} alerts
            </Badge>
          )}
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-muted-foreground">Critical Alerts</div>
            </div>
            <div className="text-2xl font-bold text-red-600">{criticalAlerts}</div>
            <div className="text-sm text-muted-foreground">
              {totalAlerts} total alerts
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Reorder Recommendations</div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{recommendationsCount}</div>
            <div className="text-sm text-muted-foreground">
              {criticalItems.length} critical items
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Estimated Order Value</div>
            </div>
            <div className="text-2xl font-bold text-green-600">
              ₱{estimatedSavings.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">
              Total recommended orders
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Avg Days to Stockout</div>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {monitoringMetrics?.avg_days_until_stockout || 0}
            </div>
            <div className="text-sm text-muted-foreground">
              Based on current consumption
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="consumption">Consumption Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Stock Alerts</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <ProactiveReorderingSystem />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reorder Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Consumption Rate</TableHead>
                    <TableHead>Days Until Stockout</TableHead>
                    <TableHead>Recommended Order</TableHead>
                    <TableHead>Urgency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reorderRecommendations.map((rec) => (
                    <TableRow key={rec.item_id}>
                      <TableCell className="font-medium">{rec.item_name}</TableCell>
                      <TableCell>{rec.current_stock} units</TableCell>
                      <TableCell>{rec.consumption_rate.toFixed(1)}/day</TableCell>
                      <TableCell>
                        <Badge variant={rec.days_until_stockout <= 3 ? "destructive" : "outline"}>
                          {rec.days_until_stockout} days
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{rec.recommended_order_quantity} units</div>
                          <div className="text-sm text-muted-foreground">
                            ₱{rec.cost_impact.toLocaleString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          rec.urgency_level === 'critical' ? 'destructive' :
                          rec.urgency_level === 'high' ? 'secondary' : 'outline'
                        }>
                          {rec.urgency_level.toUpperCase()}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Consuming Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topConsumingItems.map((item) => (
                  <div key={item.item_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{item.item_name}</span>
                      <span className="text-sm text-muted-foreground">
                        {item.daily_average.toFixed(1)} units/day
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, (item.daily_average / Math.max(...topConsumingItems.map(i => i.daily_average))) * 100)} 
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Menu Sales Impact</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Total Sales</TableHead>
                    <TableHead>Ingredients Consumed</TableHead>
                    <TableHead>Top Ingredient</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesConsumption.map((product) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.total_sales} units</TableCell>
                      <TableCell>{product.ingredient_consumption.length} items</TableCell>
                      <TableCell>
                        {product.ingredient_consumption.length > 0 && (
                          <div>
                            <div className="text-sm font-medium">
                              {product.ingredient_consumption[0].item_name}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {product.ingredient_consumption[0].total_consumed.toFixed(1)} consumed
                            </div>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stockAlerts.map((alert) => (
                  <Alert key={alert.id} className={
                    alert.urgency === 'critical' ? 'border-red-500' :
                    alert.urgency === 'high' ? 'border-orange-500' : ''
                  }>
                    <AlertTriangle className="h-4 w-4" />
                    <div className="flex-1">
                      <div className="font-medium">{alert.message}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {alert.recommended_action}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border rounded-lg ${
                      notification.read ? 'opacity-60' : ''
                    } ${
                      notification.urgency === 'critical' ? 'border-red-200 bg-red-50' :
                      notification.urgency === 'high' ? 'border-orange-200 bg-orange-50' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{notification.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </div>
                        {notification.action_text && (
                          <div className="text-sm font-medium text-blue-600 mt-2">
                            {notification.action_text}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            Mark Read
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => dismissNotification(notification.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
