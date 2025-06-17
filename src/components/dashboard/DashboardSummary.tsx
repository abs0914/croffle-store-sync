
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { getDashboardSummary } from "@/services/storeInventory/storeMetricsService";
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
    weeklyGrowth: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSummary = async () => {
      if (storeId) {
        setLoading(true);
        const data = await getDashboardSummary(storeId);
        setSummary(data);
        setLoading(false);
      }
    };

    loadSummary();
  }, [storeId]);

  const summaryCards = [
    {
      title: "Today's Sales",
      value: formatCurrency(summary.todaySales),
      icon: DollarSign,
      color: "text-green-600"
    },
    {
      title: "Today's Orders",
      value: summary.todayOrders.toString(),
      icon: ShoppingCart,
      color: "text-blue-600"
    },
    {
      title: "Avg Order Value",
      value: formatCurrency(summary.avgOrderValue),
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Inventory Alerts",
      value: summary.inventoryAlerts.toString(),
      icon: AlertTriangle,
      color: summary.inventoryAlerts > 0 ? "text-red-600" : "text-green-600"
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
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
            <card.icon className={`h-4 w-4 ${card.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
