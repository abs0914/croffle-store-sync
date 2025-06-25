
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
  BarChart3,
  Loader2
} from 'lucide-react';
import { useProactiveReordering } from '@/hooks/inventory/useProactiveReordering';
import { useStore } from '@/contexts/StoreContext';

export const ProactiveReorderingDashboard: React.FC = () => {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState('overview');

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
  } = useProactiveReordering(currentStore?.id || '');

  // Show store selection message if no store is selected
  if (!currentStore) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Please select a store to view proactive reordering dashboard.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
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
            AI-powered inventory management for {currentStore.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={loadReorderData} 
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              'Refresh Data'
            )}
          </Button>
          {unreadNotifications.length > 0 && (
            <Badge variant="destructive" className="relative gap-1">
              <Bell className="h-4 w-4" />
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
          {isLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin" />
                <p>Loading overview data...</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>System Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      Real-time data integration active for {currentStore.name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Store ID: {currentStore.id}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reorder Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {reorderRecommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No reorder recommendations at this time</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consumption" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Consuming Items</CardTitle>
            </CardHeader>
            <CardContent>
              {topConsumingItems.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No consumption data available</p>
                </div>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stock Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {stockAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-muted-foreground">No stock alerts - all items are well stocked!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stockAlerts.map((alert) => (
                    <Alert key={alert.id} variant={alert.urgency === 'critical' ? 'destructive' : 'default'}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="flex justify-between items-center">
                        <span>{alert.message}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => acknowledgeAlert(alert.id)}
                        >
                          Acknowledge
                        </Button>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No notifications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <Alert key={notification.id}>
                      <Bell className="h-4 w-4" />
                      <AlertDescription className="flex justify-between items-center">
                        <span>{notification.message}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markNotificationAsRead(notification.id)}
                          >
                            Mark Read
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissNotification(notification.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
