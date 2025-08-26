
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, AlertTriangle, BarChart3 } from "lucide-react";
import { getDashboardSummary } from "@/services/storeInventory/storeMetricsService";
import { formatCurrency } from "@/utils/format";

interface StoreDashboardSummaryProps {
  storeId: string;
  storeName: string;
}

export function StoreDashboardSummary({ storeId, storeName }: StoreDashboardSummaryProps) {
  const [summary, setSummary] = useState({
    todaySales: 0,
    todayOrders: 0,
    avgOrderValue: 0,
    inventoryAlerts: 0,
    weeklyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      setLoading(true);
      const data = await getDashboardSummary(storeId);
      setSummary(data);
      setLoading(false);
    };

    if (storeId) {
      loadSummary();
    }
  }, [storeId]);

  const summaryCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(summary.todaySales),
      icon: DollarSign,
      change: summary.weeklyGrowth,
      changeType: summary.weeklyGrowth >= 0 ? 'increase' : 'decrease'
    },
    {
      title: "Today's Orders",
      value: summary.todayOrders.toString(),
      icon: ShoppingCart,
      subtitle: "orders completed"
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(summary.avgOrderValue),
      icon: BarChart3,
      subtitle: "per transaction"
    },
    {
      title: "Inventory Alerts",
      value: summary.inventoryAlerts.toString(),
      icon: AlertTriangle,
      alertLevel: summary.inventoryAlerts > 0 ? 'warning' : 'success'
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{storeName} Dashboard</h2>
        <Badge variant="outline">Store Manager View</Badge>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className={`h-4 w-4 ${
                card.alertLevel === 'warning' ? 'text-yellow-500' :
                card.alertLevel === 'success' ? 'text-green-500' :
                'text-muted-foreground'
              }`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              {card.change !== undefined && (
                <div className="flex items-center text-xs text-muted-foreground">
                  {card.changeType === 'increase' ? (
                    <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
                  )}
                  {Math.abs(card.change).toFixed(1)}% from last week
                </div>
              )}
              {card.subtitle && (
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
