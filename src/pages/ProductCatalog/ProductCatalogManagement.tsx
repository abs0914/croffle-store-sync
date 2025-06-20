import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { EnhancedProductGrid } from '@/components/ProductCatalog/EnhancedProductGrid';
import { EnhancedProductCatalogManager } from '@/components/ProductCatalog/EnhancedProductCatalogManager';
import { CartItem } from '@/types/productVariations';
import { useAuth } from '@/contexts/auth';
import { formatCurrency } from '@/utils/format';
import { ShoppingCart, Settings } from 'lucide-react';
import { Search, 
  Filter, 
  Package,
  Image as ImageIcon,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProductCatalog, toggleProductAvailability } from '@/services/productCatalog/productCatalogService';
import { ProductCatalog } from '@/services/productCatalog/types';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const ProductCatalogManagement: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('menu');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const queryClient = useQueryClient();

  const storeId = user?.storeIds?.[0] || '';

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.finalPrice * item.quantity), 0);

  const handleCartUpdate = (items: CartItem[]) => {
    setCartItems(items);
  };

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['product-catalog', storeId],
    queryFn: () => fetchProductCatalog(storeId),
    enabled: !!storeId,
  });

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showAvailableOnly || product.is_available;
    return matchesSearch && matchesAvailability;
  });

  const handleRefetch = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['product-catalog'] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Catalog Management</h1>
          <p className="text-muted-foreground">
            Manage your store's menu with variations, pricing, and add-ons
          </p>
        </div>
        
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
                  <span className="font-semibold text-green-600">
                    {formatCurrency(totalPrice)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="menu">Enhanced Menu</TabsTrigger>
          <TabsTrigger value="management">Menu Management</TabsTrigger>
          <TabsTrigger value="current">Current Catalog</TabsTrigger>
        </TabsList>

        <TabsContent value="menu">
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

        <TabsContent value="management">
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

        <TabsContent value="current">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  variant={showAvailableOnly ? "default" : "outline"}
                  onClick={() => setShowAvailableOnly(!showAvailableOnly)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Available Only
                </Button>
                <Button onClick={handleRefetch} variant="outline">
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-2">
                        {product.product_name}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Product Image Placeholder */}
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  </div>

                  {/* Product Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-green-600">
                        ₱{product.price.toFixed(2)}
                      </span>
                      <Badge 
                        variant={product.is_available ? "default" : "secondary"}
                      >
                        {product.is_available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>

                    {product.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>
                    )}

                    {product.ingredients && product.ingredients.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {product.ingredients.length} ingredient{product.ingredients.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'Try adjusting your search terms.' : 'Products will appear here when deployed by admin.'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
