import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Package, 
  Eye, 
  EyeOff, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3,
  Pen
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { fetchUnifiedProducts, toggleProductAvailability, UnifiedProduct } from '@/services/product/unifiedProductService';
import { EditProductDialog } from '@/pages/ProductCatalog/components/EditProductDialog';
import { updateProduct } from '@/services/productCatalog/productCatalogService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useOptimizedDataFetch, useOptimizedMutation } from '@/hooks/useOptimizedDataFetch';
import { useQueryClient } from '@tanstack/react-query';

interface StoreCatalogTabProps {
  storeId: string;
}

export function StoreCatalogTab({ storeId }: StoreCatalogTabProps) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [editingProduct, setEditingProduct] = useState<UnifiedProduct | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<UnifiedProduct | null>(null);
  
  const canEditPrices = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');

  // Optimized data fetching with React Query
  const {
    data: products = [],
    isLoading: loading,
    error: productsError
  } = useOptimizedDataFetch<UnifiedProduct[]>(
    ['unified-products', storeId],
    () => fetchUnifiedProducts(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000, // 30 seconds for fresh data
        cacheTime: 2 * 60 * 1000, // 2 minutes
      }
    }
  );

  // Real-time subscription for product updates
  useEffect(() => {
    if (!storeId) return;

    const channel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          // Invalidate cache when products are updated
          queryClient.invalidateQueries({ queryKey: ['unified-products', storeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, queryClient]);

  // Optimized mutation for toggling product availability
  const { mutate: toggleAvailability } = useOptimizedMutation(
    async ({ productId, newStatus }: { productId: string; newStatus: boolean }) => {
      const success = await toggleProductAvailability(productId, newStatus);
      if (!success) throw new Error('Failed to toggle product availability');
      return success;
    },
    {
      onSuccess: () => {
        toast.success('Product availability updated successfully');
      },
      onError: (error) => {
        console.error('Error toggling product availability:', error);
        toast.error('Failed to update product availability');
      },
      invalidateQueries: [['unified-products', storeId]]
    }
  );

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    toggleAvailability({ productId, newStatus: !currentStatus });
  };

  const handleEditPrice = (product: UnifiedProduct) => {
    setEditingProduct(product);
    setEditPrice(product.price?.toString() || '0');
  };

  const handleEditProduct = (product: UnifiedProduct) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  // Convert UnifiedProduct to ProductCatalog format for the EditProductDialog
  const convertToProductCatalog = (product: UnifiedProduct) => {
    return {
      id: product.id,
      store_id: product.store_id || storeId,
      product_name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      is_available: product.is_active || false,
      display_order: 0,
      created_at: product.created_at || new Date().toISOString(),
      updated_at: product.updated_at || new Date().toISOString(),
      recipe_id: product.recipe_id || null,
      ingredients: []
    };
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setSelectedProduct(null);
  };

  const handleProductUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['unified-products', storeId] });
    handleEditDialogClose();
  };

  // Optimized mutation for updating product price
  const { mutate: updatePrice } = useOptimizedMutation(
    async ({ productId, newPrice }: { productId: string; newPrice: number }) => {
      const { error } = await supabase
        .from('products')
        .update({ price: newPrice })
        .eq('id', productId);

      if (error) throw error;
      return true;
    },
    {
      onSuccess: () => {
        setEditingProduct(null);
        toast.success('Price updated successfully');
      },
      onError: (error) => {
        console.error('Error updating price:', error);
        toast.error('Failed to update price');
      },
      invalidateQueries: [['unified-products', storeId]]
    }
  );

  const handleSavePrice = async () => {
    if (!editingProduct) return;
    
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    updatePrice({ productId: editingProduct.id, newPrice });
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
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['unified-products', storeId] })} variant="outline" size="sm">
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
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(product.price || 0)}
                    </div>
                    {canEditPrices && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditPrice(product)}
                        className="h-6 w-6 p-0"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                    )}
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
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleEditProduct(product)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleToggleAvailability(product.id, product.is_active || false)}
                    variant={product.is_active ? "outline" : "default"}
                    size="sm"
                    className="flex-1"
                  >
                    {product.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show
                      </>
                    )}
                  </Button>
                </div>
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

      {/* Price Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={() => setEditingProduct(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product Price</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="product-name">Product</Label>
              <Input
                id="product-name"
                value={editingProduct?.name || ''}
                disabled
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="price">Price (₱)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setEditingProduct(null)}>
                Cancel
              </Button>
              <Button onClick={handleSavePrice}>
                Save Price
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Edit Dialog */}
      {selectedProduct && (
        <EditProductDialog
          isOpen={showEditDialog}
          onClose={handleEditDialogClose}
          onProductUpdated={handleProductUpdated}
          product={convertToProductCatalog(selectedProduct)}
        />
      )}
    </div>
  );
}