
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChefHat, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Store, 
  DollarSign,
  AlertCircle 
} from 'lucide-react';

interface RecipeMetrics {
  totalRecipes: number;
  activeRecipes: number;
  draftRecipes: number;
  deployedStores: number;
  averageCost: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
}

interface AdminRecipesMetricsProps {
  metrics: RecipeMetrics;
}

export const AdminRecipesMetrics: React.FC<AdminRecipesMetricsProps> = ({ metrics }) => {
  const metricCards = [
    {
      title: "Total Recipes",
      value: metrics.totalRecipes,
      icon: ChefHat,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Pending Approval",
      value: metrics.pendingApproval,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50"
    },
    {
      title: "Approved",
      value: metrics.approved,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Rejected",
      value: metrics.rejected,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      title: "Deployed Stores",
      value: metrics.deployedStores,
      icon: Store,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Avg Recipe Cost",
      value: `₱${metrics.averageCost.toFixed(2)}`,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {metricCards.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${metric.bgColor}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
