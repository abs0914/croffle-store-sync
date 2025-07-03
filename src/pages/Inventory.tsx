
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProactiveReorderingDashboard } from '@/components/Inventory/components/ProactiveReorderingDashboard';
import { OptimizedInventoryList } from '@/components/inventory/OptimizedInventoryList';
import { getInventoryMetrics } from '@/services/storeInventory/storeMetricsService';
import { useStore } from '@/contexts/StoreContext';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();
  const { currentStore } = useStore();
  const [inventoryStats, setInventoryStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    isLoading: true
  });

  useEffect(() => {
    if (!currentStore?.id) return;

    const fetchInventoryStats = async () => {
      const metrics = await getInventoryMetrics(currentStore.id);
      setInventoryStats({
        totalItems: metrics.totalItems,
        lowStockItems: metrics.lowStockItems,
        outOfStockItems: metrics.outOfStockItems,
        isLoading: false
      });
    };

    fetchInventoryStats();
  }, [currentStore?.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock levels, manage orders, and optimize inventory
          </p>
        </div>
        <Button onClick={() => toast({ title: 'Feature coming soon', description: 'Add item functionality will be available soon.' })}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="proactive">Proactive Reordering</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Total Items</h3>
              <p className="text-2xl font-bold text-blue-600">
                {inventoryStats.isLoading ? '...' : inventoryStats.totalItems}
              </p>
              <p className="text-sm text-muted-foreground">Items in inventory</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Low Stock</h3>
              <p className="text-2xl font-bold text-orange-600">
                {inventoryStats.isLoading ? '...' : inventoryStats.lowStockItems}
              </p>
              <p className="text-sm text-muted-foreground">Items below threshold</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Out of Stock</h3>
              <p className="text-2xl font-bold text-red-600">
                {inventoryStats.isLoading ? '...' : inventoryStats.outOfStockItems}
              </p>
              <p className="text-sm text-muted-foreground">Items unavailable</p>
            </div>
          </div>
          
          {currentStore && (
            <OptimizedInventoryList storeId={currentStore.id} />
          )}
        </TabsContent>

        <TabsContent value="proactive">
          <ProactiveReorderingDashboard storeId="default-store-id" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
