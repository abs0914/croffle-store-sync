import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown, 
  Activity,
  RefreshCw,
  Bell,
  Settings
} from 'lucide-react';
import { SmartReorderingSystem } from './SmartReorderingSystem';
import { StockMovementTracker } from './StockMovementTracker';
import { RealTimeInventorySync } from '@/services/inventory/realTimeInventorySync';
import { RealTimeProductInventorySync } from '@/services/inventory/realTimeProductSync';
import { toast } from 'sonner';

interface EnhancedInventoryDashboardProps {
  storeId: string;
}

interface InventoryMetrics {
  totalItems: number;
  inStockItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  recentMovements: number;
}

export function EnhancedInventoryDashboard({ storeId }: EnhancedInventoryDashboardProps) {
  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalItems: 0,
    inStockItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    recentMovements: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [realTimeSync, setRealTimeSync] = useState<RealTimeInventorySync | null>(null);
  const [productSync, setProductSync] = useState<RealTimeProductInventorySync | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (storeId) {
      initializeRealTimeSync();
      fetchMetrics();
    }

    return () => {
      if (realTimeSync) realTimeSync.stopSync();
      if (productSync) productSync.stopSync();
    };
  }, [storeId]);

  const initializeRealTimeSync = () => {
    // Initialize inventory sync
    const inventorySync = new RealTimeInventorySync({
      storeId,
      onStockUpdate: (data) => {
        fetchMetrics(); // Refresh metrics when inventory changes
      },
      onLowStockAlert: (items) => {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'low_stock',
          items,
          timestamp: new Date()
        }]);
      },
      onOutOfStockAlert: (items) => {
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'out_of_stock',
          items,
          timestamp: new Date()
        }]);
      },
      enableToastNotifications: true
    });

    // Initialize product inventory sync
    const prodSync = new RealTimeProductInventorySync({
      storeId,
      onInventoryUpdate: (data) => {
        fetchMetrics(); // Refresh metrics when product inventory changes
      },
      onProductStatusChange: (productId, status) => {
        console.log(`Product ${productId} status changed to ${status}`);
      },
      enableToastNotifications: true
    });

    inventorySync.startSync();
    prodSync.startSync();
    
    setRealTimeSync(inventorySync);
    setProductSync(prodSync);
  };

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      
      // This would typically fetch from your inventory service
      // For now, we'll simulate the metrics
      const mockMetrics: InventoryMetrics = {
        totalItems: 45,
        inStockItems: 32,
        lowStockItems: 8,
        outOfStockItems: 5,
        recentMovements: 12
      };

      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Error fetching inventory metrics:', error);
      toast.error('Failed to load inventory metrics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchMetrics();
    if (realTimeSync) {
      await realTimeSync.performStockAudit();
    }
    if (productSync) {
      await productSync.performProductStatusAudit();
    }
  };

  const getHealthPercentage = () => {
    if (metrics.totalItems === 0) return 0;
    return Math.round((metrics.inStockItems / metrics.totalItems) * 100);
  };

  const getHealthColor = () => {
    const percentage = getHealthPercentage();
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time inventory monitoring and management
          </p>
        </div>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Bell className="h-3 w-3" />
              {notifications.length}
            </Badge>
          )}
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-2xl font-bold">{metrics.totalItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">In Stock</div>
            </div>
            <div className="text-2xl font-bold">{metrics.inStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-600" />
              <div className="text-sm text-muted-foreground">Low Stock</div>
            </div>
            <div className="text-2xl font-bold">{metrics.lowStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-muted-foreground">Out of Stock</div>
            </div>
            <div className="text-2xl font-bold">{metrics.outOfStockItems}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${getHealthColor()}`} />
              <div className="text-sm text-muted-foreground">Health</div>
            </div>
            <div className={`text-2xl font-bold ${getHealthColor()}`}>
              {getHealthPercentage()}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reordering">Smart Reordering</TabsTrigger>
          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Inventory Health Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Healthy Stock</span>
                    <Badge variant="default">{metrics.inStockItems} items</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Needs Attention</span>
                    <Badge variant="outline">{metrics.lowStockItems} items</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Critical</span>
                    <Badge variant="destructive">{metrics.outOfStockItems} items</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span>Stock movements today</span>
                    <span className="font-medium">{metrics.recentMovements}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span>Notifications</span>
                    <Badge variant="secondary">{notifications.length}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reordering">
          <SmartReorderingSystem storeId={storeId} />
        </TabsContent>

        <TabsContent value="movements">
          <StockMovementTracker storeId={storeId} />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Inventory Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Real-time Notifications</h4>
                  <p className="text-sm text-muted-foreground">
                    Get notified about low stock and inventory changes
                  </p>
                </div>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-reordering</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically create orders when stock runs low
                  </p>
                </div>
                <Badge variant="secondary">Configured</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Stock Movement Tracking</h4>
                  <p className="text-sm text-muted-foreground">
                    Track all inventory movements and changes
                  </p>
                </div>
                <Badge variant="default">Active</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}