
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Search, Image as ImageIcon, DollarSign, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { fetchProductCatalog, toggleProductAvailability } from "@/services/productCatalog/productCatalogService";
import { ProductCatalog } from "@/services/productCatalog/types";
import { formatCurrency } from "@/utils/format";
import { toast } from "sonner";

export default function Products() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUnavailableOnly, setShowUnavailableOnly] = useState(false);

  const storeId = user?.storeIds?.[0] || '';

  useEffect(() => {
    if (storeId) {
      loadProducts();
    }
  }, [storeId]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const productsData = await fetchProductCatalog(storeId);
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (productId: string, currentAvailability: boolean) => {
    try {
      const success = await toggleProductAvailability(productId, !currentAvailability);
      if (success) {
        // Update local state
        setProducts(prev => prev.map(product => 
          product.id === productId 
            ? { ...product, is_available: !currentAvailability }
            : product
        ));
      }
    } catch (error) {
      console.error('Error toggling product availability:', error);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-croffle-accent" />
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Loading deployed products...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-32 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">
            Manage deployed products from admin recipes for your store
          </p>
        </div>
      </div>

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
            <Button onClick={loadProducts} variant="outline">
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
                {/* Product Image Placeholder */}
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.product_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400" />
                  )}
                </div>

                {/* Product Details */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-green-600">
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
}
