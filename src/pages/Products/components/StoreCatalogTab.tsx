import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Eye, 
  EyeOff, 
  Package,
  Image as ImageIcon,
  DollarSign,
  RefreshCw
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { fetchProductCatalog, toggleProductAvailability } from '@/services/productCatalog/productCatalogService';
import { ProductCatalog } from '@/services/productCatalog/types';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface StoreCatalogTabProps {
  storeId: string;
}

export const StoreCatalogTab: React.FC<StoreCatalogTabProps> = ({ storeId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['product-catalog', storeId],
    queryFn: () => fetchProductCatalog(storeId),
    enabled: !!storeId,
  });

  const handleToggleAvailability = async (productId: string, currentAvailability: boolean) => {
    try {
      const success = await toggleProductAvailability(productId, !currentAvailability);
      if (success) {
        toast.success(`Product ${!currentAvailability ? 'enabled' : 'disabled'} successfully`);
        refetch();
      }
    } catch (error) {
      console.error('Error toggling product availability:', error);
      toast.error('Failed to update product availability');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showUnavailableOnly || !product.is_available;
    return matchesSearch && matchesAvailability;
  });

  const availableCount = products.filter(p => p.is_available).length;
  const unavailableCount = products.filter(p => !p.is_available).length;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Total Products</div>
            </div>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-2xl font-bold">{availableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Unavailable</div>
            </div>
            <div className="text-2xl font-bold">{unavailableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-muted-foreground">Avg Price</div>
            </div>
            <div className="text-2xl font-bold">
              {products.length > 0 
                ? formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length)
                : formatCurrency(0)
              }
            </div>
          </CardContent>
        </Card>
      </div>

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
              variant={showUnavailableOnly ? "default" : "outline"}
              onClick={() => setShowUnavailableOnly(!showUnavailableOnly)}
              className="flex items-center gap-2"
            >
              <EyeOff className="h-4 w-4" />
              Unavailable Only
            </Button>
            <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {products.length === 0 ? 'No products deployed' : 'No products found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {products.length === 0 
                ? 'Products will appear here when recipes are deployed from the admin panel.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleAvailability(product.id, product.is_available)}
                    className="ml-2"
                  >
                    {product.is_available ? (
                      <Eye className="h-4 w-4 text-green-600" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Product Image */}
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.product_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-success">
                      {formatCurrency(product.price)}
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

                  {product.recipe_id && (
                    <div className="text-xs text-muted-foreground">
                      Recipe ID: {product.recipe_id.slice(0, 8)}...
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAvailability(product.id, product.is_available)}
                    className="w-full"
                  >
                    {product.is_available ? 'Make Unavailable' : 'Make Available'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};