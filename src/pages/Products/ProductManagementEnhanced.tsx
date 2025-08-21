import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, 
  ChefHat, 
  Settings,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { RecipeProductSync } from '@/components/RecipeManagement/RecipeProductSync';
import { ProductStatusIndicator } from '@/components/pos/ProductStatusIndicator';
import { useProductCatalogData } from '@/hooks/useProductCatalogData';

interface ProductManagementEnhancedProps {
  storeId: string;
}

export const ProductManagementEnhanced: React.FC<ProductManagementEnhancedProps> = ({ storeId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  if (!storeId) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="text-muted-foreground">Please select a store to manage products</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { products, isLoading } = useProductCatalogData(storeId);

  // Calculate product metrics
  const metrics = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    needsSetup: products.filter(p => 
      p.product_status === 'temporarily_unavailable' && !p.recipe_id
    ).length,
    readyToSell: products.filter(p => 
      p.product_status === 'available' && p.is_available
    ).length
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enhanced Product Management</h1>
          <p className="text-muted-foreground">
            Streamlined recipe management with real-time inventory sync
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Package className="h-3 w-3" />
          {metrics.total} Products
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ready to Sell</p>
                <p className="text-2xl font-bold text-green-600">{metrics.readyToSell}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Setup Needed</p>
                <p className="text-2xl font-bold text-yellow-600">{metrics.needsSetup}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Products</p>
                <p className="text-2xl font-bold">{metrics.active}</p>
              </div>
              <Settings className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Overview
          </TabsTrigger>
          <TabsTrigger value="recipes" className="flex items-center gap-2">
            <ChefHat className="h-4 w-4" />
            Recipe Management
          </TabsTrigger>
          <TabsTrigger value="sync" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Recipe-Product Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Status Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {products.slice(0, 10).map(product => (
                  <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {typeof product.category === 'string' ? product.category : product.category?.name || 'No category'}
                      </p>
                    </div>
                    <ProductStatusIndicator
                      status={product.product_status}
                      isAvailable={product.is_available || false}
                      showIcon={true}
                    />
                  </div>
                ))}
                {products.length > 10 && (
                  <p className="text-center text-sm text-muted-foreground">
                    Showing 10 of {products.length} products
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Template Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <ChefHat className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Recipe Template Management</p>
                <p className="text-muted-foreground mb-4">
                  Manage your recipe templates and ingredient configurations
                </p>
                <Button>
                  Go to Recipe Templates
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync" className="space-y-4">
          <RecipeProductSync storeId={storeId} />
        </TabsContent>
      </Tabs>
    </div>
  );
};