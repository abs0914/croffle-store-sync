
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Package, 
  Search, 
  DollarSign,
  AlertCircle,
  Edit3,
  Check,
  X,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useProductCatalogState } from '@/hooks/product/useProductCatalogState';
import { ProductStatusManager } from './ProductStatusManager';
import { ProductStatus } from '@/services/productCatalog/types';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

export default function EnhancedProductCatalogManager() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  const storeId = user?.storeIds?.[0] || '';

  // Use unified state management
  const {
    products,
    isLoading: loading,
    error,
    updateProduct,
    updateStatus,
    isUpdating,
    isUpdatingStatus,
    refetch
  } = useProductCatalogState(storeId);

  const handleEditPrice = (productId: string, currentPrice: number) => {
    setEditingPrice(productId);
    setTempPrice(currentPrice.toString());
  };

  const handleSavePrice = (productId: string) => {
    const newPrice = parseFloat(tempPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    console.log(`🔄 Updating price for product ${productId} to:`, newPrice);
    updateProduct({ 
      id: productId, 
      updates: { price: newPrice } 
    });

    setEditingPrice(null);
    setTempPrice('');
  };

  const handleCancelEdit = () => {
    setEditingPrice(null);
    setTempPrice('');
  };

  const handleStatusChange = (productId: string, status: ProductStatus, isAvailable: boolean) => {
    console.log(`🔄 Updating status for product ${productId} to:`, status, 'available:', isAvailable);
    updateStatus({ id: productId, status, isAvailable });
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showUnavailableOnly || !product.is_available;
    return matchesSearch && matchesAvailability;
  });

  const availableCount = products.filter(p => p.is_available).length;
  const unavailableCount = products.filter(p => !p.is_available).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-croffle-accent" />
          <div>
            <h1 className="text-3xl font-bold">Product Catalog Manager</h1>
            <p className="text-muted-foreground">Loading products...</p>
          </div>
        </div>
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package className="h-8 w-8 text-croffle-accent" />
        <div>
          <h1 className="text-3xl font-bold">Product Catalog Manager</h1>
          <p className="text-muted-foreground">
            Manage product availability, pricing, and status for your store's POS system
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Enhanced Product Management</h3>
              <p className="text-sm text-blue-700 mt-1">
                Unified product catalog management with real-time updates, optimistic UI, and comprehensive status tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <Package className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-2xl font-bold">{availableCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-600" />
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
              Show Unavailable Only
            </Button>
            <Button onClick={() => refetch()} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
              {products.length === 0 ? 'No products available' : 'No products found'}
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
                  <CardTitle className="text-base line-clamp-2">
                    {product.product_name}
                  </CardTitle>
                  <ProductStatusManager
                    currentStatus={product.product_status || 'available'}
                    isAvailable={product.is_available}
                    onStatusChange={(status, isAvailable) => 
                      handleStatusChange(product.id, status, isAvailable)
                    }
                    disabled={isUpdatingStatus}
                  />
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Product Image Placeholder */}
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.product_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    {editingPrice === product.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          type="number"
                          value={tempPrice}
                          onChange={(e) => setTempPrice(e.target.value)}
                          className="h-8 text-sm"
                          min="0"
                          step="0.01"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSavePrice(product.id)}
                          className="h-8 w-8 p-0"
                          disabled={isUpdating}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold text-green-600">
                          {formatCurrency(product.price)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEditPrice(product.id, product.price)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {product.recipe_id && (
                    <div className="text-xs text-muted-foreground">
                      Recipe ID: {product.recipe_id.slice(0, 8)}...
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
