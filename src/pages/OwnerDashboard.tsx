
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { StoreDashboardSummary } from "@/components/store/StoreDashboardSummary";
import { InventoryAlertsPanel } from "@/components/store/InventoryAlertsPanel";
import { PendingOrdersPanel } from "@/components/store/PendingOrdersPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";
import { Package, BarChart3, Users, Settings } from "lucide-react";

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { currentStore } = useStore();

  // Redirect if not owner or no store selected
  if (!user || user.role !== 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Store Manager Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please select a store to view the manager dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <StoreDashboardSummary 
        storeId={currentStore.id} 
        storeName={currentStore.name}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <InventoryAlertsPanel storeId={currentStore.id} />
        <PendingOrdersPanel storeId={currentStore.id} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Package className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Inventory Management
                </p>
                <Button variant="link" className="p-0 h-auto">
                  View Details →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <BarChart3 className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Sales Reports
                </p>
                <Button variant="link" className="p-0 h-auto">
                  View Reports →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Users className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Staff Management
                </p>
                <Button variant="link" className="p-0 h-auto">
                  Manage Staff →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <Settings className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Store Settings
                </p>
                <Button variant="link" className="p-0 h-auto">
                  Configure →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
