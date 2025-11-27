import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Menu, Expand } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { useSidebar } from '@/components/ui/sidebar';


// Import existing components
import { StoreCatalogTab } from '@/components/Products/StoreCatalogTab';
export default function Products() {
  const { currentStore } = useStore();
  const { toggleSidebar } = useSidebar();
  
  if (!currentStore) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Store Selected</p>
              <p className="text-muted-foreground">Please select a store from the dropdown to manage the catalog</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const storeId = currentStore.id;
  
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Product Catalog</h1>
            <p className="text-muted-foreground">
              Managing catalog for: <span className="font-semibold">{currentStore.name}</span>
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleSidebar}
          className="hidden md:flex items-center gap-2"
        >
          <Expand className="h-4 w-4" />
          <span>Toggle Sidebar</span>
        </Button>
      </div>

      <Card>
        
        <CardContent className="py-[20px]">
          <StoreCatalogTab storeId={storeId} />
        </CardContent>
      </Card>
    </div>;
}