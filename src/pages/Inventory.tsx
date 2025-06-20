import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { InventoryOverview } from '@/components/Inventory/InventoryOverview';
import { StockManagement } from '@/components/Inventory/StockManagement';
import { OrdersManagement } from '@/components/Inventory/OrdersManagement';
import { SuppliersManagement } from '@/components/Inventory/SuppliersManagement';
import { ConversionsManagement } from '@/components/Inventory/ConversionsManagement';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/components/ui/use-toast';
import { useInventory } from '@/hooks/useInventory';
import { InventoryItem } from '@/types/inventoryManagement';
import { ProactiveReorderingDashboard } from '@/components/Inventory/components/ProactiveReorderingDashboard';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('overview');
  const { userStore } = useStore();
  const { toast } = useToast();
  const { createInventoryItem } = useInventory();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleCreate = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at' | 'last_updated' | 'supplier'>) => {
    if (!userStore?.id) {
      toast({
        title: 'Error',
        description: 'Please select a store first.',
        variant: 'destructive',
      });
      return;
    }

    const newItem = {
      ...item,
      store_id: userStore.id,
    };

    await createInventoryItem(newItem);
    setIsCreateModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track stock levels, manage orders, and optimize inventory
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stock">Stock Management</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="proactive">Proactive Reordering</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <InventoryOverview storeId={userStore?.id || ''} />
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <StockManagement storeId={userStore?.id || ''} />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">
          <OrdersManagement storeId={userStore?.id || ''} />
        </TabsContent>

        <TabsContent value="conversions" className="space-y-4">
          <ConversionsManagement storeId={userStore?.id || ''} />
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <SuppliersManagement storeId={userStore?.id || ''} />
        </TabsContent>

        <TabsContent value="proactive">
          <ProactiveReorderingDashboard storeId={userStore?.id || ''} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
