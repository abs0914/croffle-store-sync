import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Package, 
  Eye, 
  EyeOff, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { fetchUnifiedProducts, toggleProductAvailability, UnifiedProduct } from '@/services/product/unifiedProductService';
import { toast } from 'sonner';

interface StoreCatalogTabProps {
  storeId: string;
}

export function StoreCatalogTab({ storeId }: StoreCatalogTabProps) {
  const [products, setProducts] = useState<UnifiedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);

  useEffect(() => {
    if (storeId) {
      loadProducts();
    }
  }, [storeId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await fetchUnifiedProducts(storeId);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      const success = await toggleProductAvailability(productId, !currentStatus);
      if (success) {
        setProducts(prev => prev.map(product => 
          product.id === productId 
            ? { ...product, is_active: !currentStatus }
            : product
        ));
      }
    } catch (error) {
      console.error('Error toggling product availability:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showUnavailableOnly || !product.is_active;
    return matchesSearch && matchesAvailability;
  });

  const getStatusIcon = (status: 'in_stock' | 'low_stock' | 'out_of_stock') => {
    switch (status) {
      case 'in_stock':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'low_stock':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'out_of_stock':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusBadge = (status: 'in_stock' | 'low_stock' | 'out_of_stock') => {
    const variants = {
      'in_stock': 'default',
      'low_stock': 'secondary',
      'out_of_stock': 'destructive'
    } as const;
    
    const labels = {
      'in_stock': 'Available',
      'low_stock': 'Low Stock',
      'out_of_stock': 'Unavailable'
    };

    return (
      <Badge variant={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const availableCount = products.filter(p => p.inventory_status === 'in_stock').length;
  const lowStockCount = products.filter(p => p.inventory_status === 'low_stock').length;
  const unavailableCount = products.filter(p => p.inventory_status === 'out_of_stock').length;
  const avgPrice = products.length > 0 
    ? products.reduce((sum, p) => sum + (p.price || 0), 0) / products.length 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
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
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Available</div>
            </div>
            <div className="text-2xl font-bold">{availableCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div className="text-sm text-muted-foreground">Unavailable</div>
            </div>
            <div className="text-2xl font-bold">{unavailableCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">₱</span>
              <div className="text-sm text-muted-foreground">Avg Price</div>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(avgPrice)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
          size="sm"
        >
          Unavailable Only
        </Button>
        <Button onClick={loadProducts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-video bg-muted relative">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Package className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                {product.inventory_status && getStatusBadge(product.inventory_status)}
              </div>
            </div>
            
            <CardContent className="p-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                  <div className="flex items-center gap-1 ml-2">
                    {product.inventory_status && getStatusIcon(product.inventory_status)}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {product.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(product.price || 0)}
                  </div>
                  <Badge variant={product.product_type === 'recipe' ? 'secondary' : 'outline'}>
                    {product.product_type === 'recipe' ? 'Recipe' : 'Direct'}
                  </Badge>
                </div>

                {product.recipe_ingredients && product.recipe_ingredients.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Ingredients: {product.recipe_ingredients.length}
                  </div>
                )}
                
                <Button
                  onClick={() => handleToggleAvailability(product.id, product.is_active || false)}
                  variant={product.is_active ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                >
                  {product.is_active ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Make Unavailable
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Make Available
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
            <p className="text-muted-foreground">
              {searchTerm ? 'Try adjusting your search terms.' : 'No products have been deployed to this store yet.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}