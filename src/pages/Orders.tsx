
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";

export default function Orders() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();

  // Redirect managers and above to Order Management
  useEffect(() => {
    if (user && (hasPermission('manager') || hasPermission('admin') || hasPermission('owner'))) {
      // Small delay to show the redirect message briefly
      const timer = setTimeout(() => {
        navigate('/order-management');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, hasPermission, navigate]);

  // For non-managers, show POS orders placeholder
  if (!user || (!hasPermission('manager') && !hasPermission('admin') && !hasPermission('owner'))) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-8 w-8" />
              Orders
            </h1>
            <p className="text-muted-foreground">
              View customer orders and transaction history
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Customer order history and POS transactions will appear here. This feature is currently under development.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect message for managers and above
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8" />
            Orders
          </h1>
          <p className="text-muted-foreground">
            Redirecting to Order Management System...
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Redirecting to Order Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            As a manager or above, you have access to the full Order Management system where you can:
          </p>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground ml-4">
            <li>Create Purchase Orders from Commissary inventory</li>
            <li>Manage Delivery Orders and tracking</li>
            <li>Process Goods Received Notes (GRN)</li>
            <li>View Order Status and Audit Trail</li>
            <li>Access Order Analytics Dashboard</li>
          </ul>
          <div className="pt-4">
            <Button onClick={() => navigate('/order-management')} className="w-full">
              Go to Order Management System
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
