import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Pen,
  Filter,
  List,
  Grid3X3
} from 'lucide-react';
import { formatCurrency } from '@/utils/format';
import { fetchProductCatalog, updateProduct } from '@/services/productCatalog/productCatalogService';
import { ProductCatalog } from '@/services/productCatalog/types';
import { EditProductDialog } from '@/pages/ProductCatalog/components/EditProductDialog';
import { EnhancedProductListView } from './EnhancedProductListView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useOptimizedDataFetch, useOptimizedMutation } from '@/hooks/useOptimizedDataFetch';
import { useQueryClient } from '@tanstack/react-query';
import { fetchCategories } from '@/services/category/categoryFetch';
import { Category } from '@/types';

interface StoreCatalogTabProps {
  storeId: string;
}

export function StoreCatalogTab({ storeId }: StoreCatalogTabProps) {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<ProductCatalog | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalog | null>(null);
  
  const canEditPrices = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');

  // Optimized data fetching with React Query
  const {
    data: products = [],
    isLoading: loading,
    error: productsError
  } = useOptimizedDataFetch<ProductCatalog[]>(
    ['product-catalog', storeId],
    () => fetchProductCatalog(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000, // 30 seconds for fresh data
        cacheTime: 2 * 60 * 1000, // 2 minutes
      }
    }
  );

  // Fetch categories for filtering
  const {
    data: categories = [],
    isLoading: categoriesLoading
  } = useOptimizedDataFetch<Category[]>(
    ['categories', storeId],
    () => fetchCategories(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 5 * 60 * 1000, // 5 minutes for categories
        cacheTime: 10 * 60 * 1000, // 10 minutes
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
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        },
        () => {
          // Invalidate cache when products are updated
          queryClient.invalidateQueries({ queryKey: ['product-catalog', storeId] });
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
      const result = await updateProduct(productId, { is_available: newStatus });
      if (!result) throw new Error('Failed to toggle product availability');
      return result;
    },
    {
      onSuccess: () => {
        toast.success('Product availability updated successfully');
      },
      onError: (error) => {
        console.error('Error toggling product availability:', error);
        toast.error('Failed to update product availability');
      },
      invalidateQueries: [['product-catalog', storeId]]
    }
  );

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    toggleAvailability({ productId, newStatus: !currentStatus });
  };

  const handleEditPrice = (product: ProductCatalog) => {
    setEditingProduct(product);
    setEditPrice(product.price?.toString() || '0');
  };

  const handleEditProduct = (product: ProductCatalog) => {
    setSelectedProduct(product);
    setShowEditDialog(true);
  };

  const handleEditDialogClose = () => {
    setShowEditDialog(false);
    setSelectedProduct(null);
  };

  const handleProductUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['product-catalog', storeId] });
    handleEditDialogClose();
  };

  // Optimized mutation for updating product price
  const { mutate: updatePrice } = useOptimizedMutation(
    async ({ productId, newPrice }: { productId: string; newPrice: number }) => {
      const result = await updateProduct(productId, { price: newPrice });
      if (!result) throw new Error('Failed to update price');
      return result;
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
      invalidateQueries: [['product-catalog', storeId]]
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
    const matchesSearch = product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAvailability = !showUnavailableOnly || !product.is_available;
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    return matchesSearch && matchesAvailability && matchesCategory;
  });

  const getAvailabilityIcon = (isAvailable: boolean) => {
    return isAvailable ?
      <CheckCircle className="h-4 w-4 text-green-600" /> :
      <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  // Helper function to get category name
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  // Convert ProductCatalog to the format expected by EditProductDialog
  const convertToProductCatalog = (product: ProductCatalog) => {
    return {
      ...product,
      name: product.product_name, // Map product_name to name for compatibility
      is_active: product.is_available // Map is_available to is_active for compatibility
    };
  };

  const availableCount = products.filter(p => p.is_available).length;
  const lowStockCount = 0; // Not applicable for product catalog
  const unavailableCount = products.filter(p => !p.is_available).length;
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
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            Enhanced List View
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            Legacy Grid View
          </Button>
        </div>
      </div>

      {/* Enhanced List View */}
      {viewMode === 'list' ? (
        <EnhancedProductListView storeId={storeId} />
      ) : (
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
          <div className="flex gap-4 items-center flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="All Categories" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              variant={showUnavailableOnly ? "default" : "outline"}
              onClick={() => setShowUnavailableOnly(!showUnavailableOnly)}
              size="sm"
            >
              Unavailable Only
            </Button>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['product-catalog', storeId] })} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden">
                <div className="aspect-square bg-muted relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.product_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute top-1 right-1">
                    {getAvailabilityIcon(product.is_available)}
                  </div>
                </div>
                
                <CardContent className="p-2">
                  <div className="space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium line-clamp-1">{product.product_name}</h3>
                    </div>
                    
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {product.description}
                    </p>
                    
                    <Badge variant="outline" className="text-xs h-5 text-[10px]">
                      {getCategoryName(product.category_id)}
                    </Badge>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(product.price || 0)}
                        </div>
                        {canEditPrices && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPrice(product)}
                            className="h-5 w-5 p-0"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <Badge variant={product.recipe_id ? 'secondary' : 'outline'} className="text-[10px] h-4">
                        {product.recipe_id ? 'Recipe' : 'Direct'}
                      </Badge>
                    </div>

                    {product.ingredients && product.ingredients.length > 0 && (
                      <div className="text-[10px] text-muted-foreground">
                        Ingredients: {product.ingredients.length}
                      </div>
                    )}
                    
                    <div className="flex gap-1">
                      <Button
                        onClick={() => handleEditProduct(product)}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-6 text-xs"
                      >
                        <Pen className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      <Button
                        onClick={() => handleToggleAvailability(product.id, product.is_available || false)}
                        variant={product.is_available ? "outline" : "default"}
                        size="sm"
                        className="flex-1 h-6 text-xs"
                      >
                        {product.is_available ? (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
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
        </div>
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
                value={editingProduct?.product_name || ''}
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