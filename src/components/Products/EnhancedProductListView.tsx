import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Search, 
  Package, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Edit3,
  Filter,
  CheckCircle,
  Zap,
  Package2,
  AlertTriangle,
  X
} from 'lucide-react';
import { ProductEditDialog } from './ProductEditDialog';
import { formatCurrency } from '@/utils/format';
import { fetchCategories } from '@/services/category/categoryFetch';
import { 
  EnhancedProductCatalog, 
  ProductHealthSummary,
  fetchEnhancedProductCatalog,
  getProductHealthSummary 
} from '@/services/productCatalog/enhancedCatalogService';
import { updateProduct } from '@/services/productCatalog/productCatalogService';
import { Category } from '@/types';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useOptimizedDataFetch } from '@/hooks/useOptimizedDataFetch';

interface EnhancedProductListViewProps {
  storeId: string;
}

export function EnhancedProductListView({ storeId }: EnhancedProductListViewProps) {
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [editingProduct, setEditingProduct] = useState<EnhancedProductCatalog | null>(null);
  
  const canEditPrices = hasPermission('admin') || hasPermission('owner') || hasPermission('manager');

  // Fetch enhanced product data
  const {
    data: products = [],
    isLoading: loading,
    error: productsError,
    refetch: refetchProducts
  } = useOptimizedDataFetch<EnhancedProductCatalog[]>(
    ['enhanced-product-catalog', storeId],
    () => fetchEnhancedProductCatalog(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000, // 30 seconds for real-time updates
        cacheTime: 2 * 60 * 1000,
      }
    }
  );

  // Fetch health summary
  const {
    data: healthSummary,
    refetch: refetchHealthSummary
  } = useOptimizedDataFetch<ProductHealthSummary>(
    ['product-health-summary', storeId],
    () => getProductHealthSummary(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 30 * 1000,
        cacheTime: 2 * 60 * 1000,
      }
    }
  );

  // Fetch categories for filtering
  const {
    data: categories = []
  } = useOptimizedDataFetch<Category[]>(
    ['categories', storeId],
    () => fetchCategories(storeId),
    {
      enabled: !!storeId,
      cacheConfig: {
        staleTime: 5 * 60 * 1000,
        cacheTime: 10 * 60 * 1000,
      }
    }
  );

  const handleToggleAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await updateProduct(productId, { is_available: !currentStatus });
      toast.success('Product availability updated');
      refetchProducts();
      refetchHealthSummary();
    } catch (error) {
      console.error('Error toggling availability:', error);
      toast.error('Failed to update product availability');
    }
  };

  const handleEditProduct = (product: EnhancedProductCatalog) => {
    setEditingProduct(product);
  };

  const handleCloseEdit = () => {
    setEditingProduct(null);
  };

  const handleUpdateSuccess = () => {
    refetchProducts();
    refetchHealthSummary();
  };

  // Filter products based on all criteria - Updated for post-migration state
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    
    // Updated filtering logic to account for recipe_id
    const isReadyToSell = product.pos_ready || product.recipe_id;
    const matchesStock = stockFilter === 'all' || 
      (stockFilter === 'pos_ready' && isReadyToSell) ||
      (stockFilter === 'needs_attention' && !isReadyToSell);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  // Helper functions for simplified status badges - Updated for post-migration state
  const getSimpleStatusBadge = (product: EnhancedProductCatalog) => {
    // Updated logic: Products with recipe_id are considered ready to sell
    // This reflects the recent migration that linked all recipes
    if (product.pos_ready || product.recipe_id) {
      return <Badge className="bg-green-100 text-green-800 border-green-200">Ready to Sell</Badge>;
    }
    
    if (product.stock_status === 'direct_product') {
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Direct Product</Badge>;
    }
    
    // Any other status means setup is needed
    return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Setup Needed</Badge>;
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      {/* Health Summary Dashboard */}
      {healthSummary && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <div className="text-sm text-muted-foreground">Total</div>
              </div>
              <div className="text-2xl font-bold">{healthSummary.total_products}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div className="text-sm text-muted-foreground">Healthy</div>
              </div>
              <div className="text-2xl font-bold text-green-600">{healthSummary.healthy_products}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-600" />
                <div className="text-sm text-muted-foreground">POS Ready</div>
              </div>
              <div className="text-2xl font-bold text-emerald-600">{healthSummary.pos_ready}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div className="text-sm text-muted-foreground">Missing Inventory</div>
              </div>
              <div className="text-2xl font-bold text-orange-600">{healthSummary.missing_inventory}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <X className="h-4 w-4 text-red-600" />
                <div className="text-sm text-muted-foreground">Out of Stock</div>
              </div>
              <div className="text-2xl font-bold text-red-600">{healthSummary.out_of_stock}</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package2 className="h-4 w-4 text-purple-600" />
                <div className="text-sm text-muted-foreground">Missing Templates</div>
              </div>
              <div className="text-2xl font-bold text-purple-600">{healthSummary.missing_templates}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue placeholder="Category" />
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

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="pos_ready">Ready to Sell</SelectItem>
                <SelectItem value="needs_attention">Setup Needed</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={() => { refetchProducts(); refetchHealthSummary(); }} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Products List View */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
              <p className="text-muted-foreground">
                {searchTerm || selectedCategory !== 'all' || stockFilter !== 'all'
                  ? 'Try adjusting your search terms or filters.'
                  : 'No products have been deployed to this store yet.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id} 
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {/* Product Image */}
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold truncate">{product.product_name}</h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {product.description || 'No description'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="hidden md:block">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryName(product.category_id)}
                    </Badge>
                  </div>

                  {/* Simplified Status */}
                  <div className="hidden md:block">
                    {getSimpleStatusBadge(product)}
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(product.price || 0)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleEditProduct(product)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleToggleAvailability(product.id, product.is_available || false)}
                      variant={product.is_available ? "outline" : "default"}
                      size="sm"
                    >
                      {product.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Edit Dialog */}
      <ProductEditDialog
        product={editingProduct}
        isOpen={!!editingProduct}
        onClose={handleCloseEdit}
        onUpdate={handleUpdateSuccess}
        categories={categories}
      />
    </div>
  );
}