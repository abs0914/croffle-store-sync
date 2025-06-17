import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Package, ShoppingCart, Users, BarChart3, Factory } from "lucide-react";

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: "Production Management",
      description: "Manage recipes, conversions, and production workflow",
      icon: Factory,
      onClick: () => navigate("/production"),
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Store Inventory",
      description: "View and manage store inventory levels",
      icon: Package,
      onClick: () => navigate("/inventory"),
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Process Orders",
      description: "Handle pending orders and transactions",
      icon: ShoppingCart,
      onClick: () => navigate("/pos"),
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "View Reports",
      description: "Access sales and inventory reports",
      icon: BarChart3,
      onClick: () => navigate("/reports"),
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-4 flex items-start gap-3"
              onClick={action.onClick}
            >
              <div className={`p-2 rounded-md ${action.color}`}>
                <action.icon className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold">{action.title}</p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
