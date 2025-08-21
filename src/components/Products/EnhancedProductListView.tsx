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
  AlertCircle,
  CheckCircle,
  Clock,
  Edit3,
  Filter,
  AlertTriangle,
  X,
  Zap,
  Package2,
  Activity
} from 'lucide-react';
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
  const [healthFilter, setHealthFilter] = useState<string>('all');
  
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

  // Filter products based on all criteria
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    
    const matchesStock = stockFilter === 'all' || 
      (stockFilter === 'in_stock' && product.stock_status === 'in_stock') ||
      (stockFilter === 'low_stock' && product.stock_status === 'low_stock') ||
      (stockFilter === 'out_of_stock' && product.stock_status === 'out_of_stock') ||
      (stockFilter === 'missing_inventory' && product.stock_status === 'missing_inventory') ||
      (stockFilter === 'pos_ready' && product.pos_ready) ||
      (stockFilter === 'needs_attention' && !product.pos_ready);
    
    const matchesHealth = healthFilter === 'all' ||
      (healthFilter === 'healthy' && product.health_score >= 80) ||
      (healthFilter === 'issues' && product.health_score < 80) ||
      (healthFilter === 'critical' && product.health_score < 50);
    
    return matchesSearch && matchesCategory && matchesStock && matchesHealth;
  });

  // Helper functions for status badges and icons
  const getStockStatusBadge = (status: EnhancedProductCatalog['stock_status']) => {
    switch (status) {
      case 'in_stock':
        return <Badge className="bg-green-100 text-green-800 border-green-200">In Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Low Stock</Badge>;
      case 'out_of_stock':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Out of Stock</Badge>;
      case 'missing_inventory':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Missing Inventory</Badge>;
      case 'direct_product':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Direct Product</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
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
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock Status</SelectItem>
                <SelectItem value="pos_ready">POS Ready</SelectItem>
                <SelectItem value="needs_attention">Needs Attention</SelectItem>
                <SelectItem value="in_stock">In Stock</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                <SelectItem value="missing_inventory">Missing Inventory</SelectItem>
              </SelectContent>
            </Select>

            <Select value={healthFilter} onValueChange={setHealthFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Health Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Health Levels</SelectItem>
                <SelectItem value="healthy">Healthy (80%+)</SelectItem>
                <SelectItem value="issues">Has Issues (&lt;80%)</SelectItem>
                <SelectItem value="critical">Critical (&lt;50%)</SelectItem>
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
                {searchTerm || selectedCategory !== 'all' || stockFilter !== 'all' || healthFilter !== 'all'
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
                      <div className="flex items-center gap-2 ml-4">
                        <span className={`text-sm font-semibold ${getHealthScoreColor(product.health_score)}`}>
                          {product.health_score}%
                        </span>
                        <Activity className={`h-4 w-4 ${getHealthScoreColor(product.health_score)}`} />
                      </div>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="hidden md:block">
                    <Badge variant="outline" className="text-xs">
                      {getCategoryName(product.category_id)}
                    </Badge>
                  </div>

                  {/* Stock Status */}
                  <div className="hidden md:block">
                    {getStockStatusBadge(product.stock_status)}
                  </div>

                  {/* Template Status */}
                  <div className="hidden lg:block">
                    <Badge 
                      variant={product.has_recipe_template ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {product.template_status === 'missing' ? 'No Template' :
                       product.template_status === 'inactive' ? 'Template Inactive' :
                       product.stock_status === 'direct_product' ? 'Direct' : 'Template OK'}
                    </Badge>
                  </div>

                  {/* Price */}
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(product.price || 0)}
                    </div>
                    {product.stock_count !== undefined && (
                      <div className="text-xs text-muted-foreground">
                        Stock: {product.stock_count}
                      </div>
                    )}
                  </div>

                  {/* POS Ready Status */}
                  <div className="flex items-center gap-1">
                    {product.pos_ready ? (
                      <div title="POS Ready">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    ) : (
                      <div title={`POS Issues: ${product.pos_issues?.join(', ')}`}>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
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

      {/* Health Issues Summary */}
      {products.some(p => p.health_issues.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Products Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {products
                .filter(p => p.health_issues.length > 0)
                .slice(0, 10) // Show top 10 issues
                .map(product => (
                  <div key={product.id} className="flex items-start justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{product.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        Issues: {product.health_issues.join(', ')}
                      </div>
                      {product.pos_issues && product.pos_issues.length > 0 && (
                        <div className="text-xs text-red-600 mt-1">
                          POS Issues: {product.pos_issues.join(', ')}
                        </div>
                      )}
                    </div>
                    <Badge 
                      className={getHealthScoreColor(product.health_score).replace('text-', 'border-')}
                      variant="outline"
                    >
                      {product.health_score}%
                    </Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}