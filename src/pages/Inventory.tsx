
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { ProactiveReorderingDashboard } from '@/components/Inventory/components/ProactiveReorderingDashboard';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

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
              <p className="text-2xl font-bold text-blue-600">0</p>
              <p className="text-sm text-muted-foreground">Items in inventory</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Low Stock</h3>
              <p className="text-2xl font-bold text-orange-600">0</p>
              <p className="text-sm text-muted-foreground">Items below threshold</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-lg font-semibold mb-2">Out of Stock</h3>
              <p className="text-2xl font-bold text-red-600">0</p>
              <p className="text-sm text-muted-foreground">Items unavailable</p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="proactive">
          <ProactiveReorderingDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
