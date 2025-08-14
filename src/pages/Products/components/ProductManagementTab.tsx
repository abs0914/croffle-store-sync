import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  Edit,
  Eye,
  EyeOff,
  Package,
  Image as ImageIcon,
  Plus,
  ChefHat,
  Trash2,
  MoreHorizontal
} from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { formatCurrency } from '@/utils/format';
import { fetchProductCatalog } from '@/services/productCatalog/productCatalogService';
import { 
  toggleProductAvailability,
  updateProductStatus,
  deleteProduct
} from '@/services/productCatalog/productCatalogService';
import { Product } from '@/types';
import { toast } from 'sonner';

interface ProductManagementTabProps {
  onAddProduct: () => void;
}

export const ProductManagementTab: React.FC<ProductManagementTabProps> = ({ 
  onAddProduct 
}) => {
  const navigate = useNavigate();
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'recipe' | 'direct'>('all');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Fetch products with inventory status
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['unified-products', currentStore?.id],
    queryFn: () => currentStore?.id ? fetchProductCatalog(currentStore.id) : Promise.resolve([]),
    enabled: !!currentStore?.id,
    refetchInterval: 30000, // Refresh every 30 seconds for inventory status
  });

  const handleEditProduct = (productId: string) => {
    navigate(`/products/edit/${productId}`);
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map(p => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  const handleBulkToggleStatus = async () => {
    if (selectedProducts.length === 0) return;
    
    const selectedProductObjects = products.filter(p => selectedProducts.includes(p.id));
    const allActive = selectedProductObjects.every(p => p.is_active);
    const newStatus = !allActive;
    
    // Use individual toggle calls for now instead of bulk operation
    for (const productId of selectedProducts) {
      await toggleProductAvailability(productId, newStatus);
    }
    setSelectedProducts([]);
    refetch();
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }
    
    // Use individual delete calls for now instead of bulk operation
    for (const productId of selectedProducts) {
      await deleteProduct(productId);
    }
    setSelectedProducts([]);
    refetch();
  };

  const handleToggleProductStatus = async (productId: string, currentStatus: boolean) => {
    const success = await toggleProductAvailability(productId, !currentStatus);
    if (success) {
      refetch();
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    
    const success = await deleteProduct(productId);
    if (success) {
      refetch();
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || 
                       (filterType === 'recipe' && product.product_type === 'recipe') ||
                       (filterType === 'direct' && product.product_type === 'direct');
    
    return matchesSearch && matchesType;
  });

  const getProductTypeIcon = (productType: string | null) => {
    if (productType === 'recipe') {
      return <ChefHat className="h-4 w-4 text-orange-600" />;
    }
    return <Package className="h-4 w-4 text-blue-600" />;
  };

  const getProductTypeBadge = (productType: string | null) => {
    if (productType === 'recipe') {
      return <Badge variant="default" className="bg-orange-100 text-orange-800">Recipe</Badge>;
    }
    return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Direct</Badge>;
  };

  const getInventoryStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'out_of_stock':
        return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
      case 'low_stock':
        return <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-700">Low Stock</Badge>;
      case 'in_stock':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">In Stock</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
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
              <ChefHat className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Recipe Products</div>
            </div>
            <div className="text-2xl font-bold">
              {products.filter(p => p.product_type === 'recipe').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Direct Products</div>
            </div>
            <div className="text-2xl font-bold">
              {products.filter(p => p.product_type === 'direct').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Active</div>
            </div>
            <div className="text-2xl font-bold">
              {products.filter(p => p.is_active).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
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
            
            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterType('all')}
                size="sm"
              >
                All
              </Button>
              <Button
                variant={filterType === 'recipe' ? 'default' : 'outline'}
                onClick={() => setFilterType('recipe')}
                size="sm"
                className="flex items-center gap-1"
              >
                <ChefHat className="h-3 w-3" />
                Recipe
              </Button>
              <Button
                variant={filterType === 'direct' ? 'default' : 'outline'}
                onClick={() => setFilterType('direct')}
                size="sm"
                className="flex items-center gap-1"
              >
                <Package className="h-3 w-3" />
                Direct
              </Button>
            </div>
            
            <Button onClick={() => refetch()} variant="outline">
              Refresh
            </Button>
            <Button onClick={onAddProduct} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
          
          {/* Bulk Actions Bar */}
          {selectedProducts.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkToggleStatus}
                  className="flex items-center gap-1"
                >
                  <Eye className="h-3 w-3" />
                  Toggle Status
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="flex items-center gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedProducts([])}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {products.length === 0 ? 'No products created' : 'No products found'}
            </h3>
            <p className="text-muted-foreground mb-4">
              {products.length === 0 
                ? 'Start by creating your first product.'
                : 'Try adjusting your search terms or filters.'
              }
            </p>
            {products.length === 0 && (
              <Button onClick={onAddProduct} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Select All Checkbox */}
          <div className="flex items-center gap-2 px-2">
            <Checkbox
              id="select-all"
              checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
              onCheckedChange={handleSelectAll}
            />
            <label htmlFor="select-all" className="text-sm font-medium">
              Select all ({filteredProducts.length})
            </label>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className={`hover:shadow-md transition-shadow ${selectedProducts.includes(product.id) ? 'ring-2 ring-primary' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getProductTypeIcon(product.product_type)}
                          <CardTitle className="text-base line-clamp-2">
                            {product.name}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                          {getProductTypeBadge(product.product_type)}
                          {getInventoryStatusBadge(product.inventory_status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {product.is_active ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditProduct(product.id)}>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleProductStatus(product.id, product.is_active)}>
                            {product.is_active ? <EyeOff className="h-3 w-3 mr-2" /> : <Eye className="h-3 w-3 mr-2" />}
                            {product.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>

              <CardContent className="space-y-4">
                {/* Product Image */}
                <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
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
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>

                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <div className="text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </div>

                  {product.product_variations && product.product_variations.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      {product.product_variations.length} variation{product.product_variations.length !== 1 ? 's' : ''}
                    </div>
                  )}

                  {product.recipe_ingredients && product.recipe_ingredients.length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ChefHat className="h-3 w-3" />
                        {product.recipe_ingredients.length} ingredient{product.recipe_ingredients.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditProduct(product.id)}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};