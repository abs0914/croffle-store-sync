
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Plus, Package, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

// Import existing components
import { ProductManagementTab } from '@/components/Products/ProductManagementTab';
import { StoreCatalogTab } from '@/components/Products/StoreCatalogTab';

export default function Products() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('management');
  const storeId = user?.storeIds?.[0] || '';

  const handleAddProduct = () => {
    navigate('/products/new');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage your store's complete product catalog and menu
          </p>
        </div>
        
        <Button onClick={handleAddProduct} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Product
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Create & Edit Products
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Store Catalog
          </TabsTrigger>
        </TabsList>

        {/* Create & Edit Products Tab */}
        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Create & Edit Products
              </CardTitle>
              <p className="text-muted-foreground">
                Create and manage recipe-based and direct inventory products
              </p>
            </CardHeader>
            <CardContent>
              <ProductManagementTab onAddProduct={handleAddProduct} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Catalog Tab - Deployed Products */}
        <TabsContent value="catalog" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Menu className="h-5 w-5" />
                Store Catalog
              </CardTitle>
              <p className="text-muted-foreground">
                View and manage deployed products with availability controls
              </p>
            </CardHeader>
            <CardContent>
              <StoreCatalogTab storeId={storeId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
