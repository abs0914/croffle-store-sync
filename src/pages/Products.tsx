import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Menu } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { ProductMigrationButton } from '@/components/products/ProductMigrationButton';

// Import existing components
import { StoreCatalogTab } from '@/components/Products/StoreCatalogTab';
export default function Products() {
  const {
    user
  } = useAuth();
  const storeId = user?.storeIds?.[0] || '';
  const [refreshKey, setRefreshKey] = useState(0);
  const handleMigrationComplete = () => {
    setRefreshKey(prev => prev + 1);
  };
  return <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Catalog</h1>
          <p className="text-muted-foreground">
            Manage product availability from your centrally deployed catalog
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <ProductMigrationButton onMigrationComplete={handleMigrationComplete} />
        </div>
      </div>

      <Card>
        
        <CardContent className="py-[20px]">
          <StoreCatalogTab storeId={storeId} key={refreshKey} />
        </CardContent>
      </Card>
    </div>;
}