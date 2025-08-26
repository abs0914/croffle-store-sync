
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Truck, ClipboardCheck, DollarSign, Clock, Package } from "lucide-react";

interface OrderMetrics {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  completedOrders: number;
  totalValue: number;
  averageOrderValue: number;
  commissaryProducts: number;
  locationBreakdown: {
    inside_cebu: number;
    outside_cebu: number;
  };
}

export function OrderMetricsDashboard() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [metrics, setMetrics] = useState<OrderMetrics>({
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    completedOrders: 0,
    totalValue: 0,
    averageOrderValue: 0,
    commissaryProducts: 0,
    locationBreakdown: { inside_cebu: 0, outside_cebu: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.storeIds?.[0]) {
      loadMetrics();
    }
  }, [user]);

  const loadMetrics = async () => {
    if (!user?.storeIds?.[0]) return;

    setLoading(true);
    try {
      // Fetch purchase orders for the store
      const { data: orders, error: ordersError } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('store_id', user.storeIds[0]);

      if (ordersError) throw ordersError;

      // Fetch commissary products count
      const { data: commissaryItems, error: commissaryError } = await supabase
        .from('commissary_inventory')
        .select('id')
        .eq('item_type', 'orderable_item')
        .eq('is_active', true);

      if (commissaryError) throw commissaryError;

      // Calculate metrics
      const totalOrders = orders?.length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const approvedOrders = orders?.filter(o => o.status === 'approved').length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const totalValue = orders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const averageOrderValue = totalOrders > 0 ? totalValue / totalOrders : 0;
      const commissaryProducts = commissaryItems?.length || 0;

      // Location breakdown - removed as purchase_orders table doesn't have location_type
      const locationBreakdown = {
        inside_cebu: 0,
        outside_cebu: 0
      };

      setMetrics({
        totalOrders,
        pendingOrders,
        approvedOrders,
        completedOrders,
        totalValue,
        averageOrderValue,
        commissaryProducts,
        locationBreakdown
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Order Management Dashboard</h2>
        <Badge variant="secondary">{currentStore?.name}</Badge>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{metrics.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Orders</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{metrics.approvedOrders}</div>
            <p className="text-xs text-muted-foreground">Ready for delivery</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{metrics.totalValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ₱{metrics.averageOrderValue.toFixed(0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.commissaryProducts}</div>
            <p className="text-xs text-muted-foreground">Commissary finished products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store Location</CardTitle>
            <Truck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-blue-600">
              {currentStore?.location_type === 'inside_cebu' ? 'Inside Cebu' : 
               currentStore?.location_type === 'outside_cebu' ? 'Outside Cebu' : 'Not Set'}
            </div>
            <p className="text-xs text-muted-foreground">Current store location</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Region</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600">
              {currentStore?.region || 'Not Set'}
            </div>
            <p className="text-xs text-muted-foreground">Store region</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              View Pending Orders ({metrics.pendingOrders})
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              Check Deliveries
            </Badge>
            <Badge variant="outline" className="cursor-pointer hover:bg-muted">
              Review GRNs
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
