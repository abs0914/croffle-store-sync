import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Settings, Menu, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { formatCurrency } from '@/utils/format';

// Import existing components
import { EnhancedProductGrid } from '@/components/ProductCatalog/EnhancedProductGrid';
import { EnhancedProductCatalogManager } from '@/components/ProductCatalog/EnhancedProductCatalogManager';
import { ProductManagementTab } from './components/ProductManagementTab';
import { StoreCatalogTab } from './components/StoreCatalogTab';
import { CartItem } from '@/types/productVariations';

export default function UnifiedProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('management');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const storeId = user?.storeIds?.[0] || '';
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

  const handleCartUpdate = (items: CartItem[]) => {
    setCartItems(items);
  };

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
        
        <div className="flex items-center gap-4">
          {/* Cart Summary */}
          {totalItems > 0 && (
            <Card className="min-w-[200px]">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-4 w-4" />
                  <span className="font-semibold">Cart Summary</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Items:</span>
                    <Badge variant="secondary">{totalItems}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold text-success">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button onClick={handleAddProduct} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="management" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Product Management
          </TabsTrigger>
          <TabsTrigger value="catalog" className="flex items-center gap-2">
            <Menu className="h-4 w-4" />
            Store Catalog
          </TabsTrigger>
          <TabsTrigger value="enhanced" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Enhanced Menu
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Menu Config
          </TabsTrigger>
        </TabsList>

        {/* Product Management Tab - Create/Edit Products */}
        <TabsContent value="management" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Management
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

        {/* Enhanced Menu Tab - Interactive Menu */}
        <TabsContent value="enhanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Interactive Menu with Variations & Add-ons
              </CardTitle>
              <p className="text-muted-foreground">
                Experience the full menu with size options, temperature variations, and add-ons
              </p>
            </CardHeader>
            <CardContent>
              <EnhancedProductGrid 
                storeId={storeId} 
                onCartUpdate={handleCartUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu Configuration Tab - Advanced Settings */}
        <TabsContent value="configuration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Menu Configuration
              </CardTitle>
              <p className="text-muted-foreground">
                Configure menu items, variations, and pricing rules
              </p>
            </CardHeader>
            <CardContent>
              <EnhancedProductCatalogManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}