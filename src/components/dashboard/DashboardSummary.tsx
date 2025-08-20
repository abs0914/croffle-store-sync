
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/format";

interface DashboardSummaryProps {
  storeId: string;
}

export default function DashboardSummary({ storeId }: DashboardSummaryProps) {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayOrders: 0,
    avgOrderValue: 0,
    inventoryAlerts: 0,
    weeklyGrowth: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      if (storeId) {
        setLoading(true);
        try {
          const today = new Date().toISOString().split('T')[0];
          
          // Get today's metrics from store_metrics (reliable source)
          const { data: todayMetrics } = await supabase
            .from('store_metrics')
            .select('*')
            .eq('store_id', storeId)
            .eq('metric_date', today)
            .single();

          // Get real-time inventory alerts from inventory_stock
          const { data: inventoryData } = await supabase
            .from('inventory_stock')
            .select('stock_quantity, minimum_threshold')
            .eq('store_id', storeId)
            .eq('is_active', true);

          const lowStockItems = inventoryData?.filter(item => 
            item.stock_quantity > 0 && item.stock_quantity <= (item.minimum_threshold || 10)
          ).length || 0;

          const outOfStockItems = inventoryData?.filter(item => 
            item.stock_quantity === 0
          ).length || 0;

          // Get week-over-week comparison
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          const weekAgoDate = weekAgo.toISOString().split('T')[0];
          
          const { data: weekAgoMetrics } = await supabase
            .from('store_metrics')
            .select('total_sales')
            .eq('store_id', storeId)
            .eq('metric_date', weekAgoDate)
            .single();

          const todaySales = todayMetrics?.total_sales || 0;
          const weekAgoSales = weekAgoMetrics?.total_sales || 0;
          const weeklyGrowth = weekAgoSales > 0 ? ((todaySales - weekAgoSales) / weekAgoSales) * 100 : 0;

          setSummary({
            todaySales,
            todayOrders: todayMetrics?.total_orders || 0,
            avgOrderValue: todayMetrics?.average_order_value || 0,
            inventoryAlerts: lowStockItems + outOfStockItems,
            weeklyGrowth,
            lowStockItems,
            outOfStockItems
          });
        } catch (error) {
          console.error('Error loading dashboard summary:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    loadSummary();
  }, [storeId]);

  const summaryCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(summary.todaySales),
      icon: DollarSign,
      color: "text-green-600",
      trend: summary.weeklyGrowth !== 0 ? `${summary.weeklyGrowth > 0 ? '+' : ''}${summary.weeklyGrowth.toFixed(1)}% vs last week` : null
    },
    {
      title: "Today's Orders",
      value: summary.todayOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600",
      subtitle: `Avg: ${formatCurrency(summary.avgOrderValue)}`
    },
    {
      title: "Low Stock Items",
      value: summary.lowStockItems.toString(),
      icon: AlertTriangle,
      color: summary.lowStockItems > 0 ? "text-orange-600" : "text-green-600",
      subtitle: `${summary.outOfStockItems} out of stock`
    },
    {
      title: "Total Alerts",
      value: summary.inventoryAlerts.toString(),
      icon: AlertTriangle,
      color: summary.inventoryAlerts > 0 ? "text-red-600" : "text-green-600",
      subtitle: "Inventory attention needed"
    }
  ];

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">--</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {summaryCards.map((card, index) => (
        <Card key={index} className="transition-all hover:shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            {card.trend && (
              <p className={`text-xs mt-1 ${card.trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                {card.trend}
              </p>
            )}
            {card.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {card.subtitle}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
