
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Package, Users, BarChart4 } from "lucide-react";
import { Link } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
  link: string;
  isLoading?: boolean;
}

// Dashboard statistics cards component
export function DashboardStats() {
  const { dailySales, productsCount, customersCount, bestSeller, isLoading } = useDashboardStats();
  
  // Format currency
  const formattedSales = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2
  }).format(dailySales);

  // Statistics data connected to actual data
  const stats = [
    {
      title: "Daily Sales",
      value: formattedSales,
      description: "Today's total revenue",
      icon: CreditCard,
      color: "text-blue-500",
      link: "/sales",
      isLoading,
    },
    {
      title: "Products",
      value: productsCount.toString(),
      description: "Active inventory items",
      icon: Package,
      color: "text-green-500",
      link: "/inventory",
      isLoading,
    },
    {
      title: "Customers",
      value: customersCount.toString(),
      description: "Registered customers",
      icon: Users,
      color: "text-purple-500",
      link: "/customers",
      isLoading,
    },
    {
      title: "Best Seller",
      value: bestSeller.name,
      description: `${bestSeller.quantity} units sold (7 days)`,
      icon: BarChart4,
      color: "text-orange-500",
      link: "/reports",
      isLoading,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  );
}

// Individual stat card component
function StatCard({ title, value, description, icon: Icon, color, link, isLoading }: StatCardProps) {
  return (
    <Card className="border-croffle-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <Skeleton className="h-6 w-24 mb-2" />
            <Skeleton className="h-4 w-32" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold truncate" title={value}>{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
