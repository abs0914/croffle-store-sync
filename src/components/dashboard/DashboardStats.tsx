
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Package, Users, BarChart4 } from "lucide-react";
import { Link } from "react-router-dom";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
  link: string;
}

// Dashboard statistics cards component
export function DashboardStats() {
  // Mock statistics data
  const stats = [
    {
      title: "Daily Sales",
      value: "₱12,500",
      description: "Today's total revenue",
      icon: CreditCard,
      color: "text-blue-500",
      link: "/sales",
    },
    {
      title: "Products",
      value: "68",
      description: "Active inventory items",
      icon: Package,
      color: "text-green-500",
      link: "/inventory",
    },
    {
      title: "Customers",
      value: "145",
      description: "Registered customers",
      icon: Users,
      color: "text-purple-500",
      link: "/customers",
    },
    {
      title: "Best Seller",
      value: "Classic Croffle",
      description: "Most popular product",
      icon: BarChart4,
      color: "text-orange-500",
      link: "/reports",
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
function StatCard({ title, value, description, icon: Icon, color, link }: StatCardProps) {
  return (
    <Card className="border-croffle-primary/20">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
