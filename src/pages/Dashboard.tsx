
import { useEffect } from "react";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/shift";
import { Navigate } from "react-router-dom";
import DashboardSummary from "@/components/dashboard/DashboardSummary";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import InventoryAlerts from "@/components/dashboard/InventoryAlerts";
import QuickActions from "@/components/dashboard/QuickActions";

export default function Dashboard() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const { currentShift } = useShift();

  // Redirect owners to their specialized dashboard
  if (user?.role === 'owner') {
    return <Navigate to="/owner-dashboard" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        {currentStore && (
          <div className="text-sm text-muted-foreground">
            {currentStore.name}
            {currentShift && ` • Shift #${currentShift.id.slice(0, 8)}`}
          </div>
        )}
      </div>

      {currentStore ? (
        <>
          <DashboardSummary storeId={currentStore.id} />
          
          <div className="grid gap-6 md:grid-cols-2">
            <RecentTransactions storeId={currentStore.id} />
            <InventoryAlerts storeId={currentStore.id} />
          </div>
          
          <QuickActions />
        </>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Welcome to Croffle Store</h2>
          <p className="text-muted-foreground">Please select a store to view the dashboard.</p>
        </div>
      )}
    </div>
  );
}
