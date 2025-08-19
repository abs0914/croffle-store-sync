
import { useStore } from "@/contexts/StoreContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StoreInfo } from "@/components/dashboard/StoreInfo";
import QuickActions from "@/components/dashboard/QuickActions";
import DashboardSummary from "@/components/dashboard/DashboardSummary";
import InventoryAlerts from "@/components/dashboard/InventoryAlerts";
import RecentTransactions from "@/components/dashboard/RecentTransactions";
import { InventoryRecoveryPanel } from "@/components/recovery/InventoryRecoveryPanel";

export default function Dashboard() {
  console.log('Dashboard component rendering...');
  
  const { currentStore } = useStore();
  console.log('Current store:', currentStore);

  if (!currentStore) {
    console.log('No store selected, showing store selection message');
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to your POS System</h1>
          <p className="text-muted-foreground">Please select a store from the sidebar to get started.</p>
        </div>
      </div>
    );
  }

  console.log('Rendering dashboard with store:', currentStore.name);

  // Check if this is Sugbo Mercado (IT Park, Cebu) store that needs inventory recovery
  const isSugboMercado = currentStore.id === 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <DashboardHeader />
      
      {/* Inventory Recovery Panel - Only show for Sugbo Mercado */}
      {isSugboMercado && (
        <div className="mb-6">
          <InventoryRecoveryPanel />
        </div>
      )}
      
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
