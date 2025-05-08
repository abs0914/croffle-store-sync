import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, AlertCircle } from "lucide-react";
import { Product, Category, ProductVariation } from "@/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchProductVariations } from "@/services/productService";

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

  return (
    <>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products..."
            className="pl-8 border-croffle-primary/30 focus-visible:ring-croffle-accent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="mb-4 bg-croffle-background overflow-x-auto flex w-full">
          <TabsTrigger value="all" className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white">
            All
          </TabsTrigger>
          {categories.map(category => (
            <TabsTrigger 
              key={category.id} 
              value={category.id}
              className="data-[state=active]:bg-croffle-primary data-[state=active]:text-white whitespace-nowrap"
            >
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
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
                <TooltipProvider key={product.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className={`h-auto p-2 flex flex-col items-center justify-between text-left border-croffle-primary/20 hover:bg-croffle-background hover:border-croffle-primary ${
                          !isShiftActive || !product.isActive ? 'opacity-70' : ''
                        }`}
                        onClick={() => handleProductClick(product)}
                        disabled={!isShiftActive || !product.isActive}
                      >
                        {product.image ? (
                          <div className="w-full h-24 bg-gray-100 rounded-md overflow-hidden mb-2">
                            <img 
                              src={product.image} 
                              alt={product.name} 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-full h-24 bg-croffle-background rounded-md flex items-center justify-center mb-2">
                            <span className="text-croffle-primary">No image</span>
                          </div>
                        )}
                        <div className="w-full">
                          <p className="font-medium text-sm truncate">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.category ? product.category.name : getCategoryName(product.category_id)}
                          </p>
                          {!product.isActive && (
                            <span className="inline-block bg-gray-200 text-gray-700 text-xs px-1 rounded mt-1">Inactive</span>
                          )}
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {!isShiftActive 
                        ? "Start a shift to add items to cart" 
                        : !product.isActive 
                          ? "This product is inactive" 
                          : `Select ${product.name}`}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
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
          
          {isLoadingVariations ? (
            <div className="py-6 flex justify-center">
              <p>Loading variations...</p>
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              {productVariations.map(variation => (
                <Button 
                  key={variation.id}
                  onClick={() => handleVariationSelect(variation)}
                  className="w-full justify-between"
                  variant="outline"
                >
                  <span>{variation.name}</span>
                  <span className="font-bold">₱{variation.price.toFixed(2)}</span>
                </Button>
              ))}
              
              {/* Option to add base product without variation */}
              {selectedProduct && (
                <Button
                  onClick={() => {
                    if (selectedProduct) {
                      addItemToCart(selectedProduct);
                      setIsDialogOpen(false);
                    }
                  }}
                  className="w-full justify-between mt-2"
                >
                  <span>Regular (No variation)</span>
                  <span className="font-bold">₱{selectedProduct.price.toFixed(2)}</span>
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
