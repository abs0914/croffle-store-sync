
import React, { useState, useMemo, memo, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Product, Category, ProductVariation } from "@/types";
import { fetchPOSInventoryStatus, POSInventoryStatus } from "@/services/pos/posInventoryIntegrationService";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchProductVariations } from "@/services/productService";
import { useDebounce } from "@/hooks/useDebounce";
import OptimizedProductSearch from "./OptimizedProductSearch";
import ProductCategoryTabs from "./ProductCategoryTabs";
import OptimizedProductCard from "./OptimizedProductCard";
import ProductVariationsList from "./ProductVariationsList";

interface OptimizedProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  addItemToCart: (product: Product, quantity?: number, variation?: ProductVariation) => void;
  isShiftActive: boolean;
  isLoading: boolean;
  storeId?: string;
}

const OptimizedProductGrid = memo(function OptimizedProductGrid({
  products,
  categories,
  activeCategory,
  setActiveCategory,
  addItemToCart,
  isShiftActive,
  isLoading,
  storeId
}: OptimizedProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  const [inventoryStatusMap, setInventoryStatusMap] = useState<Map<string, POSInventoryStatus>>(new Map());
  
  // Fetch inventory status for POS integration
  useEffect(() => {
    if (products.length > 0 && storeId) {
      fetchPOSInventoryStatus(products, storeId).then(setInventoryStatusMap);
    }
  }, [products, storeId]);
  
  // Debounce search term to reduce filtering operations
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  
  // Memoize filtered products to prevent recalculation on every render
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const isActive = product.is_active || product.isActive;
      const matchesCategory = activeCategory === "all" || 
                             (product.category_id === activeCategory);
      
      const matchesSearch = !debouncedSearchTerm || 
                            product.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
                            (product.description && product.description.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));
      
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, debouncedSearchTerm]);

  // Memoize category name lookup function
  const getCategoryName = useMemo(() => {
    return (categoryId: string | undefined): string => {
      if (!categoryId) return "Uncategorized";
      const category = categories.find(cat => cat.id === categoryId);
      return category ? category.name : "Uncategorized";
    };
  }, [categories]);

  // Handle product selection with memoized callback
  const handleProductClick = React.useCallback(async (product: Product) => {
    if (!isShiftActive || !(product.is_active || product.isActive)) return;
    
    setSelectedProduct(product);

    try {
      setIsLoadingVariations(true);
      const variations = await fetchProductVariations(product.id);
      
      if (variations && variations.length > 0) {
        setProductVariations(variations);
        setIsDialogOpen(true);
      } else {
        addItemToCart(product);
      }
      
    } catch (error) {
      console.error("Error loading product variations:", error);
    } finally {
      setIsLoadingVariations(false);
    }
  }, [isShiftActive, addItemToCart]);

  // Handle variation selection with memoized callback
  const handleVariationSelect = React.useCallback((variation: ProductVariation) => {
    if (selectedProduct) {
      addItemToCart(selectedProduct, 1, variation);
      setIsDialogOpen(false);
    }
  }, [selectedProduct, addItemToCart]);

  const handleRegularProductSelect = React.useCallback(() => {
    if (selectedProduct) {
      addItemToCart(selectedProduct);
      setIsDialogOpen(false);
    }
  }, [selectedProduct, addItemToCart]);

  return (
    <>
      <div className="mb-4 flex gap-2">
        <OptimizedProductSearch 
          searchTerm={searchTerm} 
          setSearchTerm={setSearchTerm} 
        />
      </div>
      
      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
        <ProductCategoryTabs 
          categories={categories} 
          activeCategory={activeCategory} 
          setActiveCategory={setActiveCategory} 
        />
        
        <TabsContent value={activeCategory} className="mt-0">
          {!isShiftActive && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              <span className="text-sm text-amber-800">You need to start a shift before adding items to cart</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <p>Loading products...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 md:gap-3">
              {filteredProducts.map(product => (
                <OptimizedProductCard
                  key={product.id}
                  product={product}
                  isShiftActive={isShiftActive}
                  getCategoryName={getCategoryName}
                  onClick={handleProductClick}
                  inventoryStatus={inventoryStatusMap.get(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-64">
              <p>No products found in this category</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Variations Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name} - Select Size</DialogTitle>
            <DialogDescription>
              Choose a variation or select regular size
            </DialogDescription>
          </DialogHeader>
          
          <ProductVariationsList 
            isLoading={isLoadingVariations}
            variations={productVariations}
            onVariationSelect={handleVariationSelect}
            onRegularSelect={handleRegularProductSelect}
            selectedProduct={selectedProduct}
          />
        </DialogContent>
      </Dialog>
    </>
  );
});

export default OptimizedProductGrid;
