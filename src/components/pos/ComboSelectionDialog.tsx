import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coffee, IceCream, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Product, Category } from "@/types/product";
import { useComboService } from "@/hooks/pos/useComboService";
import { useComboDataValidation } from "@/hooks/pos/useComboDataValidation";
import { MiniCroffleComboDialog } from "./MiniCroffleComboDialog";
import { UnifiedProduct } from "@/services/product/unifiedProductService";
import { AddonCategory } from "@/services/pos/addonService";
import { MixMatchRule } from "@/types/productVariations";

interface ComboSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: UnifiedProduct[];
  categories: Category[];
  addonCategories?: AddonCategory[];
  comboRules?: MixMatchRule[];
  onAddToCart: (comboData: {
    croffle: UnifiedProduct;
    espresso: UnifiedProduct;
    comboPrice: number;
    comboName: string;
    customization?: any;
  }) => void;
}

const CROFFLE_CATEGORIES = ["Classic", "Glaze", "Fruity", "Premium", "Mini Croffle"];

export function ComboSelectionDialog({
  open,
  onOpenChange,
  products,
  categories,
  addonCategories = [],
  comboRules = [],
  onAddToCart,
}: ComboSelectionDialogProps) {
  const [step, setStep] = useState<"croffle" | "customize" | "espresso">("croffle");
  const [selectedCategory, setSelectedCategory] = useState<string>("Classic");
  const [isChangingCategory, setIsChangingCategory] = useState<boolean>(false);
  const [selectedCroffle, setSelectedCroffle] = useState<UnifiedProduct | null>(null);
  const [customizedCroffle, setCustomizedCroffle] = useState<any>(null);
  const [miniCroffleCustomization, setMiniCroffleCustomization] = useState<any>(null);
  
  const { getComboPrice, getEspressoProducts } = useComboService();
  const {
    isDataLoaded,
    isDataReady,
    hasAnyValidProducts,
    dataError,
    retryCount,
    isRefreshing,
    handleRefresh,
    resetError
  } = useComboDataValidation(products, categories);

  // Enhanced getCategoryProducts with error handling and caching
  const getCategoryProducts = useCallback((categoryName: string): UnifiedProduct[] => {
    try {
      console.log(`Getting products for category: "${categoryName}"`);
      
      // Validate inputs
      if (!categoryName || !Array.isArray(products) || !Array.isArray(categories)) {
        console.warn('Invalid input data for getCategoryProducts');
        return [];
      }
      
      // Special case for Mini Croffle with improved matching
      if (categoryName === "Mini Croffle") {
        // First try to find by name with proper croffle filtering
        let miniProducts = products.filter(p => 
          p && p.name && typeof p.name === 'string' &&
          p.name.toLowerCase().includes("mini") && 
          (p.name.toLowerCase().includes("croffle") || p.name.toLowerCase().includes("mix")) &&
          !p.name.toLowerCase().includes("box") &&
          !p.name.toLowerCase().includes("packaging") &&
          !p.name.toLowerCase().includes("container") &&
          !p.name.toLowerCase().includes("bag") &&
          p.is_active
        );
        
        // If no products found by name, try "Mix & Match" category
        if (miniProducts.length === 0) {
          const mixMatchCategory = categories.find(c => c && c.name === "Mix & Match" && c.is_active);
          if (mixMatchCategory && mixMatchCategory.id) {
            miniProducts = products.filter(p => 
              p && p.category_id === mixMatchCategory.id && 
              p.name && !p.name.toLowerCase().includes("box") &&
              !p.name.toLowerCase().includes("packaging") &&
              p.is_active
            );
          }
        }
        
        console.log(`Mini Croffle products found:`, miniProducts.length, miniProducts.map(p => p.name));
        return miniProducts || [];
      }
      
      // For other categories, find products with enhanced validation
      const matchingCategories = categories.filter(c => 
        c && c.name === categoryName && c.is_active && c.id
      );
      
      if (matchingCategories.length === 0) {
        console.log(`No active category found for "${categoryName}"`);
        return [];
      }
      
      const categoryIds = matchingCategories.map(c => c.id);
      
      console.log(`Category "${categoryName}" search:`, {
        found: categoryIds.length > 0,
        categoryIds,
        categoriesWithName: matchingCategories,
        allCategories: categories.map(c => ({ id: c.id, name: c.name, is_active: c.is_active }))
      });
      
      // Filter products with enhanced validation and exclude non-croffle items
      const categoryProducts = products.filter(p => 
        p && p.category_id && categoryIds.includes(p.category_id) && p.is_active &&
        // Exclude add-on items and packaging from croffle categories
        !(p.name && (
          p.name.toLowerCase().includes("crushed") ||
          p.name.toLowerCase().includes("box") ||
          p.name.toLowerCase().includes("packaging") ||
          p.name.toLowerCase().includes("container") ||
          p.name.toLowerCase().includes("bag") ||
          (p.name.toLowerCase().includes("biscoff") && p.name.toLowerCase().includes("crushed"))
        ))
      );
      
      console.log(`Products in "${categoryName}" category:`, {
        count: categoryProducts.length,
        products: categoryProducts.map(p => ({ id: p.id, name: p.name, category_id: p.category_id }))
      });
      
      return categoryProducts || [];
    } catch (error) {
      console.error(`Error in getCategoryProducts for "${categoryName}":`, error);
      return [];
    }
  }, [products, categories]);

  // Auto-select first available category when data is ready (only once)
  useEffect(() => {
    if (!isDataReady) return;

    const firstCategoryWithProducts = CROFFLE_CATEGORIES.find(catName => {
      try {
        return getCategoryProducts(catName).length > 0;
      } catch {
        return false;
      }
    });

    if (firstCategoryWithProducts && selectedCategory === "Classic" && getCategoryProducts("Classic").length === 0) {
      console.log('Auto-selecting category with products:', firstCategoryWithProducts);
      setSelectedCategory(firstCategoryWithProducts);
    }
  }, [isDataReady, getCategoryProducts]);

  // Reset error when dialog closes
  useEffect(() => {
    if (!open) {
      resetError();
    }
  }, [open, resetError]);

  // Enhanced debug log for combo dialog data  
  console.log('🔍 ComboSelectionDialog received:', {
    totalProducts: products.length,
    totalCategories: categories.length,
    sampleProductNames: products.slice(0, 5).map(p => p.name),
    storeFilter: categories.length > 0 ? categories[0].store_id : 'unknown',
    categoriesDetails: categories.map(c => ({
      id: c.id,
      name: c.name,
      is_active: c.is_active,
      store_id: c.store_id
    })),
    croffleProductCounts: CROFFLE_CATEGORIES.map(catName => ({
      category: catName,
      count: getCategoryProducts(catName).length,
      foundCategories: categories.filter(c => c.name === catName).length,
      categoryDetails: categories.filter(c => c.name === catName).map(c => ({ id: c.id, is_active: c.is_active }))
    }))
  });

  // Log combo service debug info
  const espressoProducts = getEspressoProducts(products, categories);
  console.log('🔍 ComboDialog - Final validation:', {
    hasEspressoProducts: espressoProducts.length > 0,
    espressoCount: espressoProducts.length,
    dataLoadStatus: { isDataLoaded, isDataReady, hasAnyValidProducts },
    validationErrors: dataError
  });

  // Enhanced category selection with visual feedback
  const handleCategorySelect = useCallback((category: string) => {
    console.log(`🏷️ Category switching from "${selectedCategory}" to "${category}"`);
    
    if (category === selectedCategory) {
      console.log('🏷️ Same category selected, no change needed');
      return;
    }

    console.log(`🏷️ Setting category to "${category}"`);
    setSelectedCategory(category);
    console.log(`🏷️ Category set to "${category}" - ${getCategoryProducts(category).length} products`);
  }, [selectedCategory, getCategoryProducts]);

  // Function is now defined above in the hook section

  // This will be logged above in the enhanced debug section

  const handleCroffleSelect = (croffle: UnifiedProduct) => {
    setSelectedCroffle(croffle);
    
    // Check if it's a Mini Croffle that needs customization
    const isMiniCroffle = croffle.name.toLowerCase().includes("mini");
    if (isMiniCroffle) {
      setStep("customize");
    } else {
      setStep("espresso");
    }
  };

  const handleMiniCroffleNext = (customization: any) => {
    setMiniCroffleCustomization(customization);
    setCustomizedCroffle(customization.customizedProduct);
    setStep("espresso");
  };

  const handleEspressoSelect = (espresso: UnifiedProduct) => {
    const croffleToUse = customizedCroffle || selectedCroffle;
    if (!croffleToUse) return;

    // Debug category mapping
    const croffleCategory = categories.find(c => c.id === selectedCroffle?.category_id)?.name || "";
    
    // Fix category mapping for Mini Croffle
    let categoryForPricing = croffleCategory;
    if (selectedCroffle?.name.toLowerCase().includes("mini")) {
      categoryForPricing = "Mini Croffle";
    }

    // Map espresso product name to espresso type for pricing
    let espressoType = "Hot Espresso"; // default
    if (espresso.name.toLowerCase().includes("iced") || espresso.name.toLowerCase().includes("cold")) {
      espressoType = "Cold Espresso";
    }

    const comboPrice = getComboPrice(categoryForPricing, espressoType);
    const comboName = `${croffleToUse.product?.name || croffleToUse.name} + ${espresso.name}`;

    console.log('Debug combo pricing:', {
      selectedCroffle: selectedCroffle?.name,
      croffleCategory,
      categoryForPricing,
      espressoName: espresso.name,
      espressoType,
      comboPrice,
      comboName
    });

    onAddToCart({
      croffle: croffleToUse,
      espresso,
      comboPrice,
      comboName,
      customization: customizedCroffle?.customization
    });

    // Reset dialog (but keep selected category)
    setStep("croffle");
    setSelectedCroffle(null);
    setCustomizedCroffle(null);
    setMiniCroffleCustomization(null);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (step === "espresso") {
      // If we came from customization, go back to customization
      const isMiniCroffle = selectedCroffle?.name.toLowerCase().includes("mini");
      setStep(isMiniCroffle ? "customize" : "croffle");
    } else if (step === "customize") {
      setStep("croffle");
    }
    
    if (step === "customize") {
      setSelectedCroffle(null);
      setCustomizedCroffle(null);
      setMiniCroffleCustomization(null);
    }
  };

  // Use the handleRefresh from the validation hook

  const handleClose = () => {
    setStep("croffle");
    setSelectedCroffle(null);
    setCustomizedCroffle(null);
    setMiniCroffleCustomization(null);
    resetError();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {step === "croffle" && "Select Your Croffle"}
            {step === "customize" && "Customize Your Mini Croffle"}
            {step === "espresso" && "Select Your Espresso"}
          </DialogTitle>
          {(step === "espresso" || step === "customize") && selectedCroffle && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{selectedCroffle.name}</Badge>
              {step === "espresso" && <span className="text-sm text-muted-foreground">+ Espresso</span>}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="flex-1 h-full">
          {/* Progressive Loading State */}
          {(!isDataLoaded || !isDataReady) && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">
                {!isDataLoaded ? "Loading products and categories..." : "Validating product data..."}
              </p>
              {retryCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Retry {retryCount}/3
                </p>
              )}
            </div>
          )}

          {/* Error State with Enhanced Recovery */}
          {isDataLoaded && !isDataReady && retryCount >= 3 && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {dataError || "Unable to load croffle products after multiple attempts. Please try refreshing or contact support."}
                </AlertDescription>
              </Alert>
              <div className="flex justify-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="gap-2"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Retry
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={handleClose}
                  size="sm"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Normal Content with Data Ready Check */}
          {isDataLoaded && isDataReady && hasAnyValidProducts && step === "croffle" && (
            <div className="space-y-6">
              {/* Enhanced Category Tabs with Visual Feedback */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Choose Category</h3>
                  <div className="text-xs text-muted-foreground">
                    {isChangingCategory ? "Loading..." : `${getCategoryProducts(selectedCategory).length} items`}
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {CROFFLE_CATEGORIES.map((category) => {
                    const categoryProducts = getCategoryProducts(category);
                    const hasProducts = categoryProducts.length > 0;
                    const isActive = selectedCategory === category;
                    
                    return (
                      <Button
                        key={category}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleCategorySelect(category)}
                        disabled={!hasProducts || isChangingCategory}
                        className={`
                          transition-all duration-200 relative
                          ${!hasProducts ? 'opacity-50' : ''}
                          ${isActive ? 'scale-105 shadow-md' : 'hover:scale-102'}
                          ${isChangingCategory ? 'opacity-70' : ''}
                        `}
                      >
                        <span className="flex items-center gap-1">
                          {category}
                          <Badge 
                            variant={isActive ? "secondary" : "outline"} 
                            className={`
                              ml-1 text-xs h-4 px-1 
                              ${isActive ? 'bg-background text-foreground' : ''}
                            `}
                          >
                            {categoryProducts.length}
                          </Badge>
                        </span>
                        {isActive && (
                          <div className="absolute inset-0 bg-primary/10 rounded-md animate-pulse" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Current Category Display */}
              <div className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{selectedCategory}</h4>
                  <Badge variant="secondary">{getCategoryProducts(selectedCategory).length} products</Badge>
                </div>
                {isChangingCategory && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading...
                  </div>
                )}
              </div>

              {/* Croffle Products with Loading State */}
              <div className={`
                transition-all duration-300 
                ${isChangingCategory ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}
              `}>
                {isChangingCategory ? (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 min-h-[200px]">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-3 animate-pulse">
                        <div className="aspect-square bg-muted rounded-md mb-2 w-16 h-16 mx-auto" />
                        <div className="h-3 bg-muted rounded mb-1" />
                        <div className="h-3 bg-muted rounded w-1/2 mx-auto" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 animate-fade-in">
                    {getCategoryProducts(selectedCategory).map((product, index) => (
                      <div
                        key={product.id}
                        className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md"
                        onClick={() => handleCroffleSelect(product)}
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {product.image_url && (
                          <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden w-16 h-16 mx-auto">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
                            />
                          </div>
                        )}
                        <h3 className="font-medium text-xs mb-1 text-center">{product.name}</h3>
                        <p className="text-primary font-semibold text-xs text-center">₱{product.price}</p>
                        {product.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 text-center">
                            {product.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!isChangingCategory && getCategoryProducts(selectedCategory).length === 0 && (
                <div className="text-center py-8 space-y-3 animate-fade-in">
                  <div className="text-4xl">🔍</div>
                  <p className="text-muted-foreground font-medium">No products available in {selectedCategory} category</p>
                  <p className="text-sm text-muted-foreground">Try selecting a different category or refresh the data</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh Data
                  </Button>
                </div>
              )}
            </div>
          )}

          {isDataLoaded && isDataReady && hasAnyValidProducts && step === "espresso" && (
            <div className="space-y-6">
              {/* Espresso Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Hot Espresso Column */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-center text-orange-600 border-b pb-2">
                    <Coffee className="inline h-5 w-5 mr-2" />
                    Hot Espresso
                  </h3>
                  {espressoProducts
                    .filter(espresso => !espresso.name.toLowerCase().includes("iced") && !espresso.name.toLowerCase().includes("cold"))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((espresso) => {
                      const croffleCategory = categories.find(c => c.id === selectedCroffle?.category_id)?.name || "";
                      
                      // Fix category mapping for Mini Croffle in display
                      let categoryForPricing = croffleCategory;
                      if (selectedCroffle?.name.toLowerCase().includes("mini")) {
                        categoryForPricing = "Mini Croffle";
                      }
                      
                      const espressoType = "Hot Espresso";
                      const comboPrice = getComboPrice(categoryForPricing, espressoType);
                      
                      return (
                        <div
                          key={espresso.id}
                          className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => handleEspressoSelect(espresso)}
                        >
                          <div className="flex items-center gap-3">
                            <Coffee className="h-6 w-6 text-orange-500" />
                            <div>
                              <h4 className="font-medium">{espresso.name}</h4>
                              <p className="text-sm text-muted-foreground">₱{espresso.price}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Cold Espresso Column */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-center text-blue-600 border-b pb-2">
                    <IceCream className="inline h-5 w-5 mr-2" />
                    Cold Espresso
                  </h3>
                  {espressoProducts
                    .filter(espresso => espresso.name.toLowerCase().includes("iced") || espresso.name.toLowerCase().includes("cold"))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((espresso) => {
                      const croffleCategory = categories.find(c => c.id === selectedCroffle?.category_id)?.name || "";
                      
                      // Fix category mapping for Mini Croffle in display
                      let categoryForPricing = croffleCategory;
                      if (selectedCroffle?.name.toLowerCase().includes("mini")) {
                        categoryForPricing = "Mini Croffle";
                      }
                      
                      const espressoType = "Cold Espresso";
                      const comboPrice = getComboPrice(categoryForPricing, espressoType);
                      
                      return (
                        <div
                          key={espresso.id}
                          className="border rounded-lg p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                          onClick={() => handleEspressoSelect(espresso)}
                        >
                          <div className="flex items-center gap-3">
                            <IceCream className="h-6 w-6 text-blue-500" />
                            <div>
                              <h4 className="font-medium">{espresso.name}</h4>
                              <p className="text-sm text-muted-foreground">₱{espresso.price}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {espressoProducts.length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground">No espresso products available</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                  >
                    {isRefreshing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* MiniCroffleComboDialog for Mini Croffle */}
        {step === "customize" && selectedCroffle && (
          <MiniCroffleComboDialog
            open={step === "customize"}
            onOpenChange={(open) => !open && setStep("croffle")}
            product={selectedCroffle}
            onNext={handleMiniCroffleNext}
            onBack={() => setStep("croffle")}
          />
        )}

        <div className="flex justify-between items-center pt-4 border-t">
          {(step === "espresso" || step === "customize") ? (
            <Button variant="outline" onClick={handleBack}>
              {step === "espresso" ? "Back to Previous Step" : "Back to Croffle Selection"}
            </Button>
          ) : (
            <div />
          )}
          
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}