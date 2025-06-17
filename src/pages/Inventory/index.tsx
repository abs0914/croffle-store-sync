
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InventoryHeader } from './components/InventoryHeader';
import { SearchFilters } from './components/SearchFilters';
import { ProductsTable } from './components/ProductsTable';
import { useStore } from '@/contexts/StoreContext';
import { Card, CardContent } from '@/components/ui/card';

export default function InventoryPage() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState('products');

  if (!currentStore) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a store to manage inventory.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory Management</h1>
        <p className="text-muted-foreground">
          Manage products and track inventory for {currentStore.name}
        </p>
      </div>

      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">Inventory Overview</h3>
        <p className="text-sm text-blue-700">
          This section focuses on product inventory and stock management. 
          Recipe management has been moved to the <strong>Admin panel</strong> for centralized control.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-1">
          <TabsTrigger value="products">Products & Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6">
          <InventoryHeader />
          <SearchFilters />
          <ProductsTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
