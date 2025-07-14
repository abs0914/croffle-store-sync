
import { useState, useEffect } from "react";
import { AlertCircle, Info } from "lucide-react";
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
import { ProductCustomizationDialog } from "../customization/ProductCustomizationDialog";
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
import { fetchComboRules } from "@/services/pos/comboRulesService";
import { ComboRule } from "@/types/productVariations";
import { shouldDisplayCategoryInPOS } from "@/utils/categoryOrdering";

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
  const [selectedProductForAddons, setSelectedProductForAddons] = useState<UnifiedProduct & { selectedVariation?: ProductVariation } | null>(null);
  
  // Enhanced customization states
  const [isEnhancedCustomizationOpen, setIsEnhancedCustomizationOpen] = useState(false);
  const [selectedProductForCustomization, setSelectedProductForCustomization] = useState<UnifiedProduct & { selectedVariation?: ProductVariation } | null>(null);
  const [comboRules, setComboRules] = useState<ComboRule[]>([]);
  
  // Load customizable recipes and addons on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load customizable recipes
        const recipes = await fetchCustomizableRecipes();
        setCustomizableRecipes(recipes);
        console.log('Loaded customizable recipes:', recipes);

        // Load addon items
        const addons = await fetchAddonRecipes(storeId);
        setAddonItems(addons);

        // Group addons by category
        const categories = groupAddonsByCategory(addons);
        setAddonCategories(categories);
        console.log('Loaded addon categories:', categories);

        // Load combo rules
        const rules = await fetchComboRules();
        setComboRules(rules);
        console.log('Loaded combo rules:', rules);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [storeId]);

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

    // Check for enhanced customization first (croffles) - prioritize over recipe customization
    if (shouldShowEnhancedCustomization(product)) {
      console.log("ProductGrid: Showing enhanced customization for croffle:", product.name);
      setSelectedProductForCustomization(product);
      setIsEnhancedCustomizationOpen(true);
      return;
    }

    // Check if this product has a customizable recipe (for non-croffle products)
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
        // Check for addon selection (already handled enhanced customization above)
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

      // Check for enhanced customization first (croffles), then addon selection
      if (shouldShowEnhancedCustomization(selectedProduct)) {
        // Close variation dialog and open enhanced customization dialog
        setIsDialogOpen(false);
        setSelectedProductForCustomization({ ...selectedProduct, selectedVariation: variation });
        setIsEnhancedCustomizationOpen(true);
      } else if (shouldShowAddonSelection(selectedProduct)) {
        // Close variation dialog and open addon dialog
        setIsDialogOpen(false);
        setSelectedProductForAddons({ ...selectedProduct, selectedVariation: variation });
        setIsAddonDialogOpen(true);
      } else {
        // Add variation directly without addons
        addItemToCart(selectedProduct, 1, variation);
        setIsDialogOpen(false);
      }
    }
  };

  // Get category name by id for display purposes
  const getCategoryName = (categoryId: string | undefined): string => {
    if (!categoryId) return "Uncategorized";
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  // Filter products based on category and search term
  const filteredProducts = products.filter(product => {
    const isActive = product.is_active || product.isActive;

    // Exclude products from hidden categories (like Add-ons)
    const categoryName = getCategoryName(product.category_id);
    const shouldDisplayCategory = shouldDisplayCategoryInPOS(categoryName);

    const matchesCategory = activeCategory === "all" ||
                           (product.category_id === activeCategory);

    const matchesSearch = !searchTerm ||
                          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return isActive && shouldDisplayCategory && matchesCategory && matchesSearch;
  });

  const handleRegularProductSelect = () => {
    if (selectedProduct) {
      // Check for enhanced customization first (croffles), then addon selection
      if (shouldShowEnhancedCustomization(selectedProduct)) {
        // Close variation dialog and open enhanced customization dialog
        setIsDialogOpen(false);
        setSelectedProductForCustomization(selectedProduct);
        setIsEnhancedCustomizationOpen(true);
      } else if (shouldShowAddonSelection(selectedProduct)) {
        // Close variation dialog and open addon dialog
        setIsDialogOpen(false);
        setSelectedProductForAddons(selectedProduct);
        setIsAddonDialogOpen(true);
      } else {
        console.log("ProductGrid: Adding regular product to cart:", selectedProduct.name);
        addItemToCart(selectedProduct);
        setIsDialogOpen(false);
      }
    }
  };

  const handleCustomizedAddToCart = (customizedItem: any) => {
    console.log("ProductGrid: Adding customized item to cart:", customizedItem);
    addItemToCart(customizedItem.product, customizedItem.quantity);
    setIsCustomizationDialogOpen(false);
  };

  // Helper function to get category name for a product based on classification
  const getProductCategoryByName = (productName: string): string => {
    const name = productName.toLowerCase();
    
    // Premium croffles
    if (name.includes('biscoff') || name.includes('choco overload') || 
        name.includes('cookies & cream') || name.includes('dark chocolate') ||
        name.includes('kitkat') || name.includes('matcha') || name.includes('nutella')) {
      return 'premium';
    }
    
    // Fruity croffles  
    if (name.includes('blueberry') || name.includes('mango') || name.includes('strawberry')) {
      return 'fruity';
    }
    
    // Classic croffles
    if (name.includes('caramel delight') || name.includes('choco marshmallow') ||
        name.includes('choco nut') || name.includes('tiramisu')) {
      return 'classic';
    }
    
    return 'unknown';
  };

  const shouldShowEnhancedCustomization = (product: UnifiedProduct): boolean => {
    const productName = product.name.toLowerCase();
    
    // Only show enhanced customization for Mini Croffle and Croffle Overload
    return productName === 'mini croffle' || productName === 'croffle overload';
  };

  const shouldShowAddonSelection = (product: UnifiedProduct): boolean => {
    const productName = product.name.toLowerCase();
    
    // Don't show addons for products that use enhanced customization
    if (shouldShowEnhancedCustomization(product)) {
      return false;
    }

    // Show addon selection for Classic, Fruity, and Premium croffles
    // First check by category_id (preferred), then fallback to name-based classification
    if (product.category) {
      const categoryName = typeof product.category === 'string' ? product.category : product.category.name;
      const categoryLower = categoryName?.toLowerCase();
      if (categoryLower === 'classic' || categoryLower === 'fruity' || categoryLower === 'premium') {
        return true;
      }
    }
    
    // Fallback to name-based classification for croffle products
    if (productName.includes('croffle')) {
      const productCategory = getProductCategoryByName(productName);
      return productCategory === 'classic' || productCategory === 'fruity' || productCategory === 'premium';
    }

    // Show addon selection for main products (not for addons themselves)
    const isAddonProduct = addonItems.some(addon =>
      addon.name.toLowerCase() === productName
    );

    // Don't show addons for addon products themselves
    if (isAddonProduct) return false;

    // Check if product is from addon category (by category name)
    const categoryName = getCategoryName(product.category_id)?.toLowerCase() || '';
    if (categoryName === 'addon' || categoryName === 'add-ons') {
      return false;
    }

    // Show addon selection for ALL other products if addons are available
    return addonItems.length > 0;
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

  const handleEnhancedCustomizationAddToCart = (customizedItems: any[]) => {
    console.log("ProductGrid: Adding enhanced customized items to cart:", customizedItems);
    
    // Add each customized item to cart
    customizedItems.forEach(item => {
      addItemToCart(item.product, item.quantity);
    });

    setIsEnhancedCustomizationOpen(false);
    setSelectedProductForCustomization(null);
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
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4 mb-4 md:mb-6 flex-shrink-0">
          <ProductSearch searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        </div>
        
        {/* Category Tabs */}
        <div className="flex-shrink-0 mb-4 md:mb-6">
          <ProductCategoryTabs 
            categories={categories} 
            activeCategory={activeCategory} 
            setActiveCategory={setActiveCategory} 
          />
        </div>
        
        {/* Products Content */}
        <div className="flex-1 overflow-y-auto">
          {!isShiftActive && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mb-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <span className="text-sm text-amber-800 font-medium">You need to start a shift before adding items to cart</span>
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading products...</p>
              </div>
            </div>
          ) : filteredProducts.length > 0 ? (
            activeCategory === "all" ? (
              // Group products by category when showing all (excluding addon categories)
              // Note: Categories are already sorted and filtered by the categoryFetch service
              <div className="space-y-8">
                {categories.map(category => {
                  const categoryProducts = filteredProducts.filter(product =>
                    product.category_id === category.id
                  );

                  if (categoryProducts.length === 0) return null;

                   return (
                     <div key={category.id} className="space-y-4">
                       <h2 className="text-lg font-semibold text-gray-900">{category.name}</h2>
                         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                           {categoryProducts.map(product => (
                             <ProductCard
                               key={product.id}
                               product={product}
                               isShiftActive={isShiftActive}
                               getCategoryName={getCategoryName}
                               onClick={handleProductClick}
                             />
                           ))}
                         </div>
                     </div>
                   );
                })}

                {/* Uncategorized products */}
                {(() => {
                  const uncategorizedProducts = filteredProducts.filter(product =>
                    !product.category_id || !categories.find(cat => cat.id === product.category_id)
                  );

                  if (uncategorizedProducts.length > 0) {
                     return (
                       <div key="uncategorized" className="space-y-4">
                         <h2 className="text-lg font-semibold text-gray-900">Other Items</h2>
                           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
                             {uncategorizedProducts.map(product => (
                               <ProductCard
                                 key={product.id}
                                 product={product}
                                 isShiftActive={isShiftActive}
                                 getCategoryName={getCategoryName}
                                 onClick={handleProductClick}
                               />
                             ))}
                           </div>
                       </div>
                     );
                  }
                  return null;
                })()}
              </div>
            ) : (
              // Single category grid view
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
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
            )
          ) : (
            <div className="flex justify-center items-center h-64">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium">No products found</p>
                <p className="text-gray-500 text-sm mt-1">Try adjusting your search or category filter</p>
              </div>
            </div>
          )}
        </div>
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

      {/* Enhanced Product Customization Dialog */}
      <ProductCustomizationDialog
        isOpen={isEnhancedCustomizationOpen}
        onClose={() => {
          setIsEnhancedCustomizationOpen(false);
          setSelectedProductForCustomization(null);
        }}
        product={selectedProductForCustomization}
        addonCategories={addonCategories}
        comboRules={comboRules}
        onAddToCart={handleEnhancedCustomizationAddToCart}
      />
    </>
  );
}
