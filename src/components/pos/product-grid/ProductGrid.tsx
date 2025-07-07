
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Product, Category, ProductVariation } from "@/types";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { fetchProductVariations } from "@/services/productService";
import ProductSearch from "./ProductSearch";
import ProductCategoryTabs from "./ProductCategoryTabs";
import ProductCard from "./ProductCard";
import ProductVariationsList from "./ProductVariationsList";
import { useProductFilters } from "@/hooks/product/useProductFilters";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  addItemToCart: (product: Product, quantity?: number, variation?: ProductVariation) => void;
  isShiftActive: boolean;
  isLoading: boolean;
  storeId?: string;
}

export default function ProductGrid({
  products,
  categories,
  activeCategory,
  setActiveCategory,
  addItemToCart,
  isShiftActive,
  isLoading,
  storeId
}: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  
  // Handle product selection
  const handleProductClick = async (product: Product) => {
    console.log("ProductGrid: Product clicked", {
      productName: product.name,
      productId: product.id,
      isShiftActive,
      isActive: product.is_active || product.isActive
    });

    if (!isShiftActive) {
      console.log("ProductGrid: Shift not active, cannot add to cart");
      return;
    }
    
    if (!(product.is_active || product.isActive)) {
      console.log("ProductGrid: Product not active, cannot add to cart");
      return;
    }
    
    setSelectedProduct(product);

    try {
      setIsLoadingVariations(true);
      const variations = await fetchProductVariations(product.id);
      console.log("ProductGrid: Fetched variations:", variations);
      
      // If there are variations, show the dialog
      if (variations && variations.length > 0) {
        setProductVariations(variations);
        setIsDialogOpen(true);
      } else {
        // If no variations, add the product directly
        console.log("ProductGrid: Adding regular product directly (no variations)");
        console.log("ProductGrid: Calling addItemToCart with:", {
          product: product.name,
          productId: product.id,
          price: product.price
        });
        addItemToCart(product);
      }
      
    } catch (error) {
      console.error("ProductGrid: Error loading product variations:", error);
    } finally {
      setIsLoadingVariations(false);
    }
  };

  // Handle variation selection
  const handleVariationSelect = (variation: ProductVariation) => {
    if (selectedProduct) {
      console.log("ProductGrid: Adding variation to cart:", {
        variation: variation.name,
        product: selectedProduct.name,
        price: variation.price
      });
      addItemToCart(selectedProduct, 1, variation);
      setIsDialogOpen(false);
    }
  };
  
  // Filter products based on category and search term
  const filteredProducts = products.filter(product => {
    const isActive = product.is_active || product.isActive;
    const matchesCategory = activeCategory === "all" || 
                           (product.category_id === activeCategory);
    
    const matchesSearch = !searchTerm || 
                          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Get category name by id for display purposes
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const handleRegularProductSelect = () => {
    if (selectedProduct) {
      console.log("ProductGrid: Adding regular product to cart:", selectedProduct.name);
      addItemToCart(selectedProduct);
      setIsDialogOpen(false);
    }
  };

  console.log("ProductGrid: Render state", {
    productsCount: products.length,
    filteredProductsCount: filteredProducts.length,
    isShiftActive,
    isLoading,
    activeCategory
  });

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="mb-4 flex gap-2 flex-shrink-0">
          <ProductSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        
        <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="flex flex-col h-full">
          <ProductCategoryTabs 
            categories={categories} 
            activeCategory={activeCategory} 
            setActiveCategory={setActiveCategory} 
          />
          
          <TabsContent value={activeCategory} className="mt-0 flex-1 overflow-y-auto">
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isShiftActive={isShiftActive}
                    getCategoryName={getCategoryName}
                    onClick={handleProductClick}
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
      </div>

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
}
