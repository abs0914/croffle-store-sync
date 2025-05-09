
import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Product, Category, ProductVariation } from "@/types";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchProductVariations } from "@/services/productService";
import { Button } from "@/components/ui/button";
import ProductSearch from "./ProductSearch";
import ProductCategoryTabs from "./ProductCategoryTabs";
import ProductCard from "./ProductCard";
import ProductVariationsList from "./ProductVariationsList";

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  addItemToCart: (product: Product, quantity?: number, variation?: ProductVariation) => void;
  isShiftActive: boolean;
  isLoading: boolean;
}

export default function ProductGrid({
  products,
  categories,
  activeCategory,
  setActiveCategory,
  addItemToCart,
  isShiftActive,
  isLoading
}: ProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);
  
  // Handle product selection
  const handleProductClick = async (product: Product) => {
    if (!isShiftActive || !product.isActive) return;
    
    setSelectedProduct(product);

    try {
      setIsLoadingVariations(true);
      const variations = await fetchProductVariations(product.id);
      
      // If there are variations, show the dialog
      if (variations && variations.length > 0) {
        setProductVariations(variations);
        setIsDialogOpen(true);
      } else {
        // If no variations, add the product directly
        addItemToCart(product);
      }
      
    } catch (error) {
      console.error("Error loading product variations:", error);
    } finally {
      setIsLoadingVariations(false);
    }
  };

  // Handle variation selection
  const handleVariationSelect = (variation: ProductVariation) => {
    if (selectedProduct) {
      addItemToCart(selectedProduct, 1, variation);
      setIsDialogOpen(false);
    }
  };
  
  const filteredProducts = products.filter(product => {
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
      addItemToCart(selectedProduct);
      setIsDialogOpen(false);
    }
  };

  return (
    <>
      <div className="mb-4 flex gap-2">
        <ProductSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
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
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

      {/* Product Variations Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name} - Select Size</DialogTitle>
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
