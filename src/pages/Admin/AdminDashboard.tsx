
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Store, 
  Users,
  Building2,
  Crown,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatNumber } from '@/utils/format';

interface AdminStats {
  totalStores: number;
  companyOwnedStores: number;
  franchiseStores: number;
  totalSales: number;
  totalOrders: number;
  companyOwnedSales: number;
  franchiseSales: number;
  companyOwnedOrders: number;
  franchiseOrders: number;
  topProduct: {
    name: string;
    totalSales: number;
    quantitySold: number;
  } | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalStores: 0,
    companyOwnedStores: 0,
    franchiseStores: 0,
    totalSales: 0,
    totalOrders: 0,
    companyOwnedSales: 0,
    franchiseSales: 0,
    companyOwnedOrders: 0,
    franchiseOrders: 0,
    topProduct: null
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAdminStats();
  }, []);

  const fetchAdminStats = async () => {
    try {
      setIsLoading(true);
      
      // Get date range for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      // Fetch stores data
      const { data: storesData, error: storesError } = await supabase
        .from('stores')
        .select('id, name, store_type, is_active')
        .eq('is_active', true);

      if (storesError) throw storesError;

      const totalStores = storesData?.length || 0;
      const companyOwnedStores = storesData?.filter(store => store.store_type === 'company_owned').length || 0;
      const franchiseStores = storesData?.filter(store => store.store_type === 'franchise').length || 0;

      // Fetch transactions data with store information
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          *,
          stores:store_id(store_type)
        `)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (transactionsError) throw transactionsError;

      // Calculate totals
      const totalSales = transactionsData?.reduce((sum, tx) => sum + tx.total, 0) || 0;
      const totalOrders = transactionsData?.length || 0;

      const companyOwnedTransactions = transactionsData?.filter(tx => 
        tx.stores?.store_type === 'company_owned'
      ) || [];
      const franchiseTransactions = transactionsData?.filter(tx => 
        tx.stores?.store_type === 'franchise'
      ) || [];

      const companyOwnedSales = companyOwnedTransactions.reduce((sum, tx) => sum + tx.total, 0);
      const franchiseSales = franchiseTransactions.reduce((sum, tx) => sum + tx.total, 0);
      const companyOwnedOrders = companyOwnedTransactions.length;
      const franchiseOrders = franchiseTransactions.length;

      // Calculate top selling product
      const productSales: Record<string, { totalSales: number; quantitySold: number }> = {};
      
      transactionsData?.forEach(tx => {
        const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
        
        items?.forEach((item: any) => {
          const productName = item.name;
          const quantity = item.quantity || 0;
          const totalPrice = item.totalPrice || 0;
          
          if (!productSales[productName]) {
            productSales[productName] = { totalSales: 0, quantitySold: 0 };
          }
          
          productSales[productName].totalSales += totalPrice;
          productSales[productName].quantitySold += quantity;
        });
      });

      // Find top product by total sales
      let topProduct = null;
      if (Object.keys(productSales).length > 0) {
        const topProductEntry = Object.entries(productSales).reduce(
          (max, [name, data]) => data.totalSales > max.data.totalSales ? { name, data } : max,
          { name: '', data: { totalSales: 0, quantitySold: 0 } }
        );
        
        topProduct = {
          name: topProductEntry.name,
          totalSales: topProductEntry.data.totalSales,
          quantitySold: topProductEntry.data.quantitySold
        };
      }

      setStats({
        totalStores,
        companyOwnedStores,
        franchiseStores,
        totalSales,
        totalOrders,
        companyOwnedSales,
        franchiseSales,
        companyOwnedOrders,
        franchiseOrders,
        topProduct
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of all stores and business performance (Last 30 days)
          </p>
        </div>
        <Button onClick={fetchAdminStats} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalStores)}</div>
            <div className="flex gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                <Building2 className="h-3 w-3 mr-1" />
                {stats.companyOwnedStores} Company
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                {stats.franchiseStores} Franchise
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              Across all stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(stats.totalOrders)}</div>
            <p className="text-xs text-muted-foreground">
              Completed transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Selling Product</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats.topProduct ? (
              <>
                <div className="text-lg font-bold truncate" title={stats.topProduct.name}>
                  {stats.topProduct.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(stats.topProduct.totalSales)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatNumber(stats.topProduct.quantitySold)} units sold
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">No sales data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Store Type Comparison */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company-Owned Stores
            </CardTitle>
            <CardDescription>Performance of company-owned locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Sales</span>
              <span className="text-lg font-bold">{formatCurrency(stats.companyOwnedSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Orders</span>
              <span className="text-lg font-bold">{formatNumber(stats.companyOwnedOrders)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Avg per Store</span>
              <span className="text-sm">
                {stats.companyOwnedStores > 0 
                  ? formatCurrency(stats.companyOwnedSales / stats.companyOwnedStores)
                  : formatCurrency(0)
                }
              </span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Sales Share</span>
                <span>
                  {stats.totalSales > 0 
                    ? `${((stats.companyOwnedSales / stats.totalSales) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ 
                    width: stats.totalSales > 0 
                      ? `${(stats.companyOwnedSales / stats.totalSales) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Franchise Stores
            </CardTitle>
            <CardDescription>Performance of franchise locations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Sales</span>
              <span className="text-lg font-bold">{formatCurrency(stats.franchiseSales)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Total Orders</span>
              <span className="text-lg font-bold">{formatNumber(stats.franchiseOrders)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Avg per Store</span>
              <span className="text-sm">
                {stats.franchiseStores > 0 
                  ? formatCurrency(stats.franchiseSales / stats.franchiseStores)
                  : formatCurrency(0)
                }
              </span>
            </div>
            <div className="pt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Sales Share</span>
                <span>
                  {stats.totalSales > 0 
                    ? `${((stats.franchiseSales / stats.totalSales) * 100).toFixed(1)}%`
                    : '0%'
                  }
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ 
                    width: stats.totalSales > 0 
                      ? `${(stats.franchiseSales / stats.totalSales) * 100}%` 
                      : '0%' 
                  }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
