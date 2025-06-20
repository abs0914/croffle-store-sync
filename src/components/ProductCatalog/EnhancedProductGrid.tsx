
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Search, Plus, Coffee, Package } from 'lucide-react';
import { ProductVariationSelector } from './ProductVariationSelector';
import { EnhancedProductCatalogItem, ProductVariation, AddOnItem, CartItem } from '@/types/productVariations';
import { 
  fetchEnhancedProductCatalog, 
  fetchProductVariations, 
  fetchAddOnItems,
  findComboDiscount,
  fetchComboRules
} from '@/services/productVariations/productVariationsService';
import { formatCurrency } from '@/utils/format';
import { toast } from 'sonner';

interface EnhancedProductGridProps {
  storeId: string;
  onCartUpdate?: (items: CartItem[]) => void;
}

export const EnhancedProductGrid: React.FC<EnhancedProductGridProps> = ({
  storeId,
  onCartUpdate
}) => {
  const [products, setProducts] = useState<EnhancedProductCatalogItem[]>([]);
  const [addOns, setAddOns] = useState<AddOnItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<EnhancedProductCatalogItem | null>(null);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [productsData, addOnsData] = await Promise.all([
        fetchEnhancedProductCatalog(storeId),
        fetchAddOnItems()
      ]);
      
      setProducts(productsData);
      setAddOns(addOnsData);
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (product: EnhancedProductCatalogItem) => {
    try {
      const variations = await fetchProductVariations(product.id);
      setProductVariations(variations);
      setSelectedProduct(product);
    } catch (error) {
      console.error('Error loading product variations:', error);
      toast.error('Failed to load product options');
    }
  };

  const handleAddToCart = (
    product: EnhancedProductCatalogItem,
    selectedVariations: ProductVariation[],
    selectedAddOns: AddOnItem[],
    finalPrice: number
  ) => {
    const cartItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      product,
      selectedVariations,
      selectedAddOns,
      quantity: 1,
      finalPrice
    };

    const updatedCart = [...cartItems, cartItem];
    setCartItems(updatedCart);
    
    if (onCartUpdate) {
      onCartUpdate(updatedCart);
    }

    toast.success(`${product.product_name} added to cart`);
    setSelectedProduct(null);
  };

  const filteredProducts = products.filter(product =>
    product.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const croffleProducts = filteredProducts.filter(p => 
    p.product_name.toLowerCase().includes('croffle')
  );
  
  const drinkProducts = filteredProducts.filter(p => 
    p.product_name.toLowerCase().includes('coffee') ||
    p.product_name.toLowerCase().includes('latte') ||
    p.product_name.toLowerCase().includes('cappuccino') ||
    p.product_name.toLowerCase().includes('americano') ||
    p.product_name.toLowerCase().includes('mocha')
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Croffles Section */}
      {croffleProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <h3 className="text-xl font-semibold">Croffles</h3>
            <Badge variant="secondary">{croffleProducts.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {croffleProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{product.product_name}</CardTitle>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-green-600">
                      From {formatCurrency(product.price - 60)}
                    </span>
                    <Badge variant="outline">
                      {product.variations?.filter(v => v.variation_type === 'size').length || 0} sizes
                    </Badge>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleProductSelect(product)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Customize & Add
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Drinks Section */}
      {drinkProducts.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-blue-600" />
            <h3 className="text-xl font-semibold">Drinks</h3>
            <Badge variant="secondary">{drinkProducts.length}</Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drinkProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{product.product_name}</CardTitle>
                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {product.description}
                    </p>
                  )}
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-green-600">
                      From {formatCurrency(product.price)}
                    </span>
                    <Badge variant="outline">Hot/Iced</Badge>
                  </div>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleProductSelect(product)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Customize & Add
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Product Variation Dialog */}
      <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <ProductVariationSelector
              product={selectedProduct}
              variations={productVariations}
              addOns={addOns}
              onAddToCart={handleAddToCart}
              onClose={() => setSelectedProduct(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {filteredProducts.length === 0 && !loading && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No products found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'No products available.'}
          </p>
        </div>
      )}
    </div>
  );
};
