
import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Category, ProductVariation } from "@/types";
import { UnifiedProduct } from "@/services/product/unifiedProductService";
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
import CategorySection from "./CategorySection";
import { useProductFilters } from "@/hooks/product/useProductFilters";
import { RecipeCustomizationDialog } from "../customization/RecipeCustomizationDialog";
import { AddonSelectionDialog } from "../addons/AddonSelectionDialog";
import {
  fetchCustomizableRecipes,
  CustomizableRecipe,
  isCustomizableRecipe
} from "@/services/pos/customizableRecipeService";
import {
  fetchAddonRecipes,
  groupAddonsByCategory,
  getRecommendedAddons,
  AddonItem,
  AddonCategory
} from "@/services/pos/addonService";

interface ProductGridProps {
  products: UnifiedProduct[];
  categories: Category[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  addItemToCart: (product: UnifiedProduct, quantity?: number, variation?: ProductVariation) => void;
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
  const [selectedProduct, setSelectedProduct] = useState<UnifiedProduct | null>(null);
  const [productVariations, setProductVariations] = useState<ProductVariation[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoadingVariations, setIsLoadingVariations] = useState(false);

  // Customizable recipe states
  const [customizableRecipes, setCustomizableRecipes] = useState<CustomizableRecipe[]>([]);
  const [selectedCustomizableRecipe, setSelectedCustomizableRecipe] = useState<CustomizableRecipe | null>(null);
  const [isCustomizationDialogOpen, setIsCustomizationDialogOpen] = useState(false);

  // Addon states
  const [addonItems, setAddonItems] = useState<AddonItem[]>([]);
  const [addonCategories, setAddonCategories] = useState<AddonCategory[]>([]);
  const [isAddonDialogOpen, setIsAddonDialogOpen] = useState(false);
  const [selectedProductForAddons, setSelectedProductForAddons] = useState<UnifiedProduct | null>(null);
  
  // Load customizable recipes and addons on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load customizable recipes
        const recipes = await fetchCustomizableRecipes();
        setCustomizableRecipes(recipes);
        console.log('Loaded customizable recipes:', recipes);

        // Load addon items
        const addons = await fetchAddonRecipes();
        setAddonItems(addons);

        // Group addons by category
        const categories = groupAddonsByCategory(addons);
        setAddonCategories(categories);
        console.log('Loaded addon categories:', categories);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Handle product selection
  const handleProductClick = async (product: UnifiedProduct) => {
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

    // Check if this product has a customizable recipe
    const customizableRecipe = customizableRecipes.find(recipe =>
      recipe.name.toLowerCase() === product.name.toLowerCase() ||
      recipe.name.toLowerCase().includes(product.name.toLowerCase()) ||
      product.name.toLowerCase().includes(recipe.name.toLowerCase())
    );

    if (customizableRecipe) {
      console.log("ProductGrid: Found customizable recipe for product:", customizableRecipe);
      setSelectedCustomizableRecipe(customizableRecipe);
      setIsCustomizationDialogOpen(true);
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
        // If no variations, check if we should show addon selection
        if (shouldShowAddonSelection(product)) {
          console.log("ProductGrid: Showing addon selection for product:", product.name);
          setSelectedProductForAddons(product);
          setIsAddonDialogOpen(true);
        } else {
          // Add the product directly without addons
          console.log("ProductGrid: Adding regular product directly (no variations, no addons)");
          console.log("ProductGrid: Calling addItemToCart with:", {
            product: product.name,
            productId: product.id,
            price: product.price
          });
          addItemToCart(product);
        }
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

      // Check if we should show addon selection for this variation
      if (shouldShowAddonSelection(selectedProduct)) {
        // Close variation dialog and open addon dialog
        setIsDialogOpen(false);
        setSelectedProductForAddons(selectedProduct);
        setIsAddonDialogOpen(true);
        // Store the selected variation for later use
        setSelectedProduct({ ...selectedProduct, selectedVariation: variation });
      } else {
        // Add variation directly without addons
        addItemToCart(selectedProduct, 1, variation);
        setIsDialogOpen(false);
      }
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

  const handleCustomizedAddToCart = (customizedItem: any) => {
    console.log("ProductGrid: Adding customized item to cart:", customizedItem);
    addItemToCart(customizedItem.product, customizedItem.quantity, null, customizedItem);
    setIsCustomizationDialogOpen(false);
  };

  const shouldShowAddonSelection = (product: UnifiedProduct): boolean => {
    // Show addon selection for main products (not for addons themselves)
    const productName = product.name.toLowerCase();
    const isAddonProduct = addonItems.some(addon =>
      addon.name.toLowerCase() === productName
    );

    // Don't show addons for addon products themselves
    if (isAddonProduct) return false;

    // Show addons for croffles, coffee drinks, and other main products
    return productName.includes('croffle') ||
           productName.includes('coffee') ||
           productName.includes('latte') ||
           productName.includes('americano') ||
           productName.includes('cappuccino') ||
           productName.includes('mocha') ||
           addonItems.length > 0; // Show for any product if addons are available
  };

  const handleAddonAddToCart = (addonCartItems: any[]) => {
    console.log("ProductGrid: Adding addon items to cart:", addonCartItems);

    // First add the main product (with variation if selected)
    if (selectedProductForAddons) {
      const variation = (selectedProductForAddons as any).selectedVariation;
      if (variation) {
        addItemToCart(selectedProductForAddons, 1, variation);
      } else {
        addItemToCart(selectedProductForAddons);
      }
    }

    // Then add each addon as separate cart items
    addonCartItems.forEach(addonItem => {
      addItemToCart(addonItem.product, addonItem.quantity);
    });

    setIsAddonDialogOpen(false);
    setSelectedProductForAddons(null);
  };

  const handleSkipAddons = () => {
    // Add just the main product without addons (with variation if selected)
    if (selectedProductForAddons) {
      console.log("ProductGrid: Adding product without addons:", selectedProductForAddons.name);
      const variation = (selectedProductForAddons as any).selectedVariation;
      if (variation) {
        addItemToCart(selectedProductForAddons, 1, variation);
      } else {
        addItemToCart(selectedProductForAddons);
      }
    }
    setIsAddonDialogOpen(false);
    setSelectedProductForAddons(null);
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
              activeCategory === "all" ? (
                // Group products by category when showing all
                <div className="space-y-8">
                  {categories.map(category => {
                    const categoryProducts = filteredProducts.filter(product =>
                      product.category_id === category.id
                    );

                    return (
                      <CategorySection
                        key={category.id}
                        title={category.name}
                        products={categoryProducts}
                        isShiftActive={isShiftActive}
                        getCategoryName={getCategoryName}
                        onClick={handleProductClick}
                        getRecommendedAddons={getRecommendedAddons}
                        addonItems={addonItems}
                        addItemToCart={addItemToCart}
                        shouldShowAddonSelection={shouldShowAddonSelection}
                      />
                    );
                  })}

                  {/* Uncategorized products */}
                  {(() => {
                    const uncategorizedProducts = filteredProducts.filter(product =>
                      !product.category_id || !categories.find(cat => cat.id === product.category_id)
                    );

                    if (uncategorizedProducts.length > 0) {
                      return (
                        <CategorySection
                          key="uncategorized"
                          title="Other Items"
                          products={uncategorizedProducts}
                          isShiftActive={isShiftActive}
                          getCategoryName={getCategoryName}
                          onClick={handleProductClick}
                          getRecommendedAddons={getRecommendedAddons}
                          addonItems={addonItems}
                          addItemToCart={addItemToCart}
                          shouldShowAddonSelection={shouldShowAddonSelection}
                        />
                      );
                    }
                    return null;
                  })()}
                </div>
              ) : (
                // Single category grid view
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-1">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      isShiftActive={isShiftActive}
                      getCategoryName={getCategoryName}
                      onClick={handleProductClick}
                      recommendedAddons={getRecommendedAddons(product.name, addonItems)}
                      onAddonQuickAdd={(addonItems) => {
                        // Add the main product first
                        addItemToCart(product);
                        // Then add each addon
                        addonItems.forEach(addonItem => {
                          addItemToCart(addonItem.product, addonItem.quantity);
                        });
                      }}
                      showAddonQuickSelect={shouldShowAddonSelection(product)}
                    />
                  ))}
                </div>
              )
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

      {/* Recipe Customization Dialog */}
      <RecipeCustomizationDialog
        isOpen={isCustomizationDialogOpen}
        onClose={() => setIsCustomizationDialogOpen(false)}
        recipe={selectedCustomizableRecipe}
        onAddToCart={handleCustomizedAddToCart}
      />

      {/* Addon Selection Dialog */}
      <AddonSelectionDialog
        isOpen={isAddonDialogOpen}
        onClose={handleSkipAddons}
        addonCategories={addonCategories}
        productName={selectedProductForAddons?.name}
        onAddToCart={handleAddonAddToCart}
        recommendedAddons={
          selectedProductForAddons
            ? getRecommendedAddons(selectedProductForAddons.name, addonItems)
            : []
        }
      />
    </>
  );
}
