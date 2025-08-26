
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Users, 
  Store, 
  Package, 
  ClipboardList, 
  ChefHat,
  Factory,
  ArrowRightLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Building2,
  Handshake
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/utils/format';

interface StoreMetrics {
  totalStores: number;
  companyOwnedStores: number;
  franchiseStores: number;
  companyOwnedSales: number;
  franchiseSales: number;
  companyOwnedOrders: number;
  franchiseOrders: number;
}

export default function AdminDashboard() {
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics>({
    totalStores: 0,
    companyOwnedStores: 0,
    franchiseStores: 0,
    companyOwnedSales: 0,
    franchiseSales: 0,
    companyOwnedOrders: 0,
    franchiseOrders: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStoreMetrics();
  }, []);

  const fetchStoreMetrics = async () => {
    try {
      // Get store counts by ownership type
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, ownership_type, is_active');

      if (storesError) throw storesError;

      const activeStores = stores?.filter(store => store.is_active) || [];
      const companyOwned = activeStores.filter(store => store.ownership_type === 'company_owned');
      const franchise = activeStores.filter(store => store.ownership_type === 'franchisee');

      // Get sales data for the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select('store_id, total, status')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (transactionsError) throw transactionsError;

      // Calculate metrics
      const companyOwnedStoreIds = companyOwned.map(store => store.id);
      const franchiseStoreIds = franchise.map(store => store.id);

      const companyOwnedTransactions = transactions?.filter(tx => 
        companyOwnedStoreIds.includes(tx.store_id)
      ) || [];
      
      const franchiseTransactions = transactions?.filter(tx => 
        franchiseStoreIds.includes(tx.store_id)
      ) || [];

      const companyOwnedSales = companyOwnedTransactions.reduce((sum, tx) => sum + tx.total, 0);
      const franchiseSales = franchiseTransactions.reduce((sum, tx) => sum + tx.total, 0);

      setStoreMetrics({
        totalStores: activeStores.length,
        companyOwnedStores: companyOwned.length,
        franchiseStores: franchise.length,
        companyOwnedSales,
        franchiseSales,
        companyOwnedOrders: companyOwnedTransactions.length,
        franchiseOrders: franchiseTransactions.length
      });
    } catch (error) {
      console.error('Error fetching store metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalSales = storeMetrics.companyOwnedSales + storeMetrics.franchiseSales;
  const totalOrders = storeMetrics.companyOwnedOrders + storeMetrics.franchiseOrders;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System overview and key metrics
          </p>
        </div>
        <Badge variant="outline">Admin Panel</Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeMetrics.totalStores}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <Building2 className="h-3 w-3 text-blue-500 mr-1" />
              {storeMetrics.companyOwnedStores} Company • {storeMetrics.franchiseStores} Franchise
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">245</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +12 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipe Templates</CardTitle>
            <ChefHat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +7 from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commissary Items</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156</div>
            <div className="flex items-center text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              +15 from last month
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Company Owned vs Franchise Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Company Owned vs Franchise Performance
          </CardTitle>
          <CardDescription>Sales and order comparison for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Company Owned Sales */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Company Owned Sales</p>
                  <p className="text-sm text-blue-700">{storeMetrics.companyOwnedStores} stores</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency(storeMetrics.companyOwnedSales)}
                </div>
                <div className="text-sm text-blue-700">
                  {totalSales > 0 ? ((storeMetrics.companyOwnedSales / totalSales) * 100).toFixed(1) : 0}% of total sales
                </div>
              </div>
            </div>

            {/* Franchise Sales */}
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Handshake className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Franchise Sales</p>
                  <p className="text-sm text-green-700">{storeMetrics.franchiseStores} stores</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-900">
                  {formatCurrency(storeMetrics.franchiseSales)}
                </div>
                <div className="text-sm text-green-700">
                  {totalSales > 0 ? ((storeMetrics.franchiseSales / totalSales) * 100).toFixed(1) : 0}% of total sales
                </div>
              </div>
            </div>

            {/* Company Owned Orders */}
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <ClipboardList className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium text-purple-900">Company Orders</p>
                  <p className="text-sm text-purple-700">Last 30 days</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-purple-900">
                  {storeMetrics.companyOwnedOrders.toLocaleString()}
                </div>
                <div className="text-sm text-purple-700">
                  Avg: {storeMetrics.companyOwnedStores > 0 ? 
                    (storeMetrics.companyOwnedOrders / storeMetrics.companyOwnedStores).toFixed(1) : 0} per store
                </div>
              </div>
            </div>

            {/* Franchise Orders */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <ClipboardList className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-900">Franchise Orders</p>
                  <p className="text-sm text-orange-700">Last 30 days</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-orange-900">
                  {storeMetrics.franchiseOrders.toLocaleString()}
                </div>
                <div className="text-sm text-orange-700">
                  Avg: {storeMetrics.franchiseStores > 0 ? 
                    (storeMetrics.franchiseOrders / storeMetrics.franchiseStores).toFixed(1) : 0} per store
                </div>
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Performance Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Average Sales per Company Store:</span>
                <span className="font-medium ml-2">
                  {storeMetrics.companyOwnedStores > 0 ? 
                    formatCurrency(storeMetrics.companyOwnedSales / storeMetrics.companyOwnedStores) : 
                    formatCurrency(0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Average Sales per Franchise:</span>
                <span className="font-medium ml-2">
                  {storeMetrics.franchiseStores > 0 ? 
                    formatCurrency(storeMetrics.franchiseSales / storeMetrics.franchiseStores) : 
                    formatCurrency(0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Company Order Value:</span>
                <span className="font-medium ml-2">
                  {storeMetrics.companyOwnedOrders > 0 ? 
                    formatCurrency(storeMetrics.companyOwnedSales / storeMetrics.companyOwnedOrders) : 
                    formatCurrency(0)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Franchise Order Value:</span>
                <span className="font-medium ml-2">
                  {storeMetrics.franchiseOrders > 0 ? 
                    formatCurrency(storeMetrics.franchiseSales / storeMetrics.franchiseOrders) : 
                    formatCurrency(0)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              System Alerts
            </CardTitle>
            <CardDescription>Important notifications requiring attention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4 p-3 bg-yellow-50 rounded-lg">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Low stock alert: Flour</p>
                <p className="text-xs text-muted-foreground">Commissary inventory below threshold</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">5 pending store approvals</p>
                <p className="text-xs text-muted-foreground">New store registrations waiting for review</p>
              </div>
            </div>
            <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">All systems operational</p>
                <p className="text-xs text-muted-foreground">No critical issues detected</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest system activities and operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Recipe deployed to Store A</p>
                <p className="text-xs text-muted-foreground">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Commissary conversion completed</p>
                <p className="text-xs text-muted-foreground">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">New manager registered</p>
                <p className="text-xs text-muted-foreground">6 hours ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium">Bulk inventory upload processed</p>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Chain Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Supply Chain Flow
          </CardTitle>
          <CardDescription>Overview of the commissary → production → store pipeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg flex-1">
              <div className="flex items-center gap-3">
                <Factory className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium">Raw Materials</p>
                  <p className="text-sm text-muted-foreground">Commissary inventory</p>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-600">156</span>
            </div>
            
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg flex-1">
              <div className="flex items-center gap-3">
                <ChefHat className="h-6 w-6 text-green-600" />
                <div>
                  <p className="font-medium">Recipe Production</p>
                  <p className="text-sm text-muted-foreground">Active conversions</p>
                </div>
              </div>
              <span className="text-lg font-bold text-green-600">89</span>
            </div>
            
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            
            <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg flex-1">
              <div className="flex items-center gap-3">
                <Store className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="font-medium">Store Inventory</p>
                  <p className="text-sm text-muted-foreground">Ready products</p>
                </div>
              </div>
              <span className="text-lg font-bold text-purple-600">12</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <a 
              href="/admin/stores" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Store className="h-8 w-8 mb-2 text-blue-600" />
              <span className="text-sm font-medium">Manage Stores</span>
            </a>
            <a 
              href="/admin/users" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Users className="h-8 w-8 mb-2 text-green-600" />
              <span className="text-sm font-medium">Manage Users</span>
            </a>
            <a 
              href="/admin/commissary-inventory" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Factory className="h-8 w-8 mb-2 text-purple-600" />
              <span className="text-sm font-medium">Commissary</span>
            </a>
            <a 
              href="/admin/reports" 
              className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <BarChart3 className="h-8 w-8 mb-2 text-orange-600" />
              <span className="text-sm font-medium">View Reports</span>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
