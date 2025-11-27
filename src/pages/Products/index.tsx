import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Package } from 'lucide-react';
import { useStore } from '@/contexts/StoreContext';
import { ProductManagementEnhanced } from './ProductManagementEnhanced';

const ProductsPage: React.FC = () => {
  const { currentStore } = useStore();
  const [activeView, setActiveView] = useState('standard');

  if (!currentStore) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">No Store Selected</p>
              <p className="text-muted-foreground">Please select a store from the dropdown to manage products</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const storeId = currentStore.id;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold">Product Management</h1>
              <p className="text-muted-foreground">
                Managing products for: <span className="font-semibold">{currentStore.name}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Recipe Management View */}
      <ProductManagementEnhanced storeId={storeId} />
    </div>
  );
};

export default ProductsPage;