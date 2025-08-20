import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Menu, Expand } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSidebar } from '@/components/ui/sidebar';


// Import existing components
import { StoreCatalogTab } from '@/components/Products/StoreCatalogTab';
export default function Products() {
  const {
    user
  } = useAuth();
  const { toggleSidebar } = useSidebar();
  const storeId = user?.storeIds?.[0] || '';
  
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
              Manage product availability from your centrally deployed catalog
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