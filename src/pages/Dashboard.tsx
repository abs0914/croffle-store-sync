
import { useSafeStore } from "@/hooks/useSafeStore";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StoreInfo } from "@/components/dashboard/StoreInfo";
import QuickActions from "@/components/dashboard/QuickActions";
import DashboardSummary from "@/components/dashboard/DashboardSummary";
import InventoryAlerts from "@/components/dashboard/InventoryAlerts";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import { trackComponentLoad, endMetric } from "@/utils/performanceMonitor";
import { useEffect } from "react";

export default function Dashboard() {
  console.log('Dashboard component rendering...');

  const { currentStore, isLoading, error } = useSafeStore();
  console.log('Current store:', currentStore, 'Loading:', isLoading, 'Error:', error);

  // Track dashboard loading performance
  useEffect(() => {
    trackComponentLoad('Dashboard');
    return () => {
      endMetric('component_load_Dashboard', {
        hasStore: !!currentStore,
        storeId: currentStore?.id
      });
    };
  }, [currentStore]);

  // Show loading state only for a brief moment to avoid blocking UI
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading Dashboard...</h1>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            This should only take a moment...
          </p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error (but still allow access)
  if (error && error !== 'Store context not available') {
    console.log('Store error but allowing access:', error);
  }

  // Allow dashboard access even without store selection (store loading is now optional)
  if (!currentStore) {
    console.log('No store selected, showing store selection message');
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to your POS System</h1>
          <p className="text-muted-foreground mb-4">
            {error && error !== 'Store context not available' 
              ? `Store loading error: ${error}. Please try refreshing the page.`
              : 'Please select a store from the sidebar to access store-specific features.'
            }
          </p>
          <div className="mt-6">
            <QuickActions />
          </div>
        </div>
      </div>
    );
  }

  console.log('Rendering dashboard with store:', currentStore.name);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DashboardHeader />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <DashboardSummary storeId={currentStore.id} />
          <QuickActions />
        </div>
        
        <div className="space-y-6">
          <StoreInfo />
          <InventoryAlerts storeId={currentStore.id} />
          <RecentTransactions storeId={currentStore.id} />
        </div>
      </div>
    </div>
  );
}
