import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coffee, IceCream, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { Product, Category } from "@/types/product";
import { useComboService } from "@/hooks/pos/useComboService";
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
  const [selectedCroffle, setSelectedCroffle] = useState<UnifiedProduct | null>(null);
  const [customizedCroffle, setCustomizedCroffle] = useState<any>(null);
  const [miniCroffleCustomization, setMiniCroffleCustomization] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { getComboPrice, getEspressoProducts } = useComboService();

  // Check if data is properly loaded
  const isDataLoaded = useMemo(() => {
    const hasProducts = products && products.length > 0;
    const hasCategories = categories && categories.length > 0;
    return hasProducts && hasCategories;
  }, [products, categories]);

  // Validate if there are any croffle products available
  const hasAnyValidProducts = useMemo(() => {
    if (!isDataLoaded) return false;
    
    return CROFFLE_CATEGORIES.some(catName => {
      if (catName === "Mini Croffle") {
        const hasMiniByName = products.some(p => p.name.toLowerCase().includes("mini") && p.is_active);
        if (hasMiniByName) return true;
        
        const mixMatchCategory = categories.find(c => c.name === "Mix & Match");
        return mixMatchCategory && products.some(p => p.category_id === mixMatchCategory.id && p.is_active);
      }
      const category = categories.find(c => c.name === catName);
      return category && products.some(p => p.category_id === category.id && p.is_active);
    });
  }, [products, categories, isDataLoaded]);

  // Auto-select first available category when data loads
  useEffect(() => {
    if (!isDataLoaded || !hasAnyValidProducts) return;

    const firstCategoryWithProducts = CROFFLE_CATEGORIES.find(catName => {
      if (catName === "Mini Croffle") {
        const hasMiniByName = products.some(p => p.name.toLowerCase().includes("mini") && p.is_active);
        if (hasMiniByName) return true;
        
        const mixMatchCategory = categories.find(c => c.name === "Mix & Match");
        return mixMatchCategory && products.some(p => p.category_id === mixMatchCategory.id && p.is_active);
      }
      const category = categories.find(c => c.name === catName);
      return category && products.some(p => p.category_id === category.id && p.is_active);
    });

    if (firstCategoryWithProducts && firstCategoryWithProducts !== selectedCategory) {
      console.log('Auto-selecting category with products:', firstCategoryWithProducts);
      setSelectedCategory(firstCategoryWithProducts);
      setDataError(null);
    }
  }, [products, categories, isDataLoaded, hasAnyValidProducts]);

  // Reset error when dialog closes
  useEffect(() => {
    if (!open) {
      setDataError(null);
      setIsRefreshing(false);
    }
  }, [open]);

  // Enhanced debug logging
  console.log('ComboSelectionDialog Debug:', {
    open,
    isDataLoaded,
    hasAnyValidProducts,
    productsCount: products.length,
    categoriesCount: categories.length,
    selectedCategory,
    dataError,
    products: products.map(p => ({ id: p.id, name: p.name, category_id: p.category_id, is_active: p.is_active })),
    categories: categories.map(c => ({ id: c.id, name: c.name, is_active: c.is_active })),
    croffleCategories: CROFFLE_CATEGORIES
  });

  const getCategoryProducts = (categoryName: string) => {
    console.log(`Getting products for category: "${categoryName}"`);
    
    // Special case for Mini Croffle - look for products with "Mini" in name OR in "Mix & Match" category
    if (categoryName === "Mini Croffle") {
      // First try to find by name
      let miniProducts = products.filter(p => 
        p.name.toLowerCase().includes("mini") && 
        p.is_active
      );
      
      // If no products found by name, try "Mix & Match" category
      if (miniProducts.length === 0) {
        const mixMatchCategory = categories.find(c => c.name === "Mix & Match");
        if (mixMatchCategory) {
          miniProducts = products.filter(p => 
            p.category_id === mixMatchCategory.id && 
            p.is_active
          );
        }
      }
      
      console.log(`Mini Croffle products found:`, miniProducts.length, miniProducts.map(p => p.name));
      return miniProducts;
    }
    
    // For other categories, find products by category name with more robust matching
    // Handle multiple categories with the same name (data consistency issue)
    const categoryIds = categories
      .filter(c => c.name === categoryName && c.is_active)
      .map(c => c.id);
    
    console.log(`Category "${categoryName}" search:`, {
      found: categoryIds.length > 0,
      categoryIds,
      categoriesWithName: categories.filter(c => c.name === categoryName),
      allCategories: categories.map(c => ({ id: c.id, name: c.name, is_active: c.is_active }))
    });
    
    if (categoryIds.length === 0) {
      console.log(`No active category found for "${categoryName}"`);
      return [];
    }
    
    // Filter products that belong to any of the matching category IDs
    const categoryProducts = products.filter(p => 
      categoryIds.includes(p.category_id) && 
      p.is_active
    );
    
    console.log(`Products in "${categoryName}" category:`, {
      count: categoryProducts.length,
      products: categoryProducts.map(p => ({ id: p.id, name: p.name, category_id: p.category_id }))
    });
    
    return categoryProducts;
  };

  const espressoProducts = getEspressoProducts(products, categories);

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
      espressoType = "Iced Espresso";
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

    // Reset dialog
    setStep("croffle");
    setSelectedCategory("Classic");
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

  const handleRefresh = () => {
    setIsRefreshing(true);
    setDataError(null);
    
    // Trigger a re-evaluation of the data by forcing a re-render
    setTimeout(() => {
      setIsRefreshing(false);
      
      // Check if we now have valid data
      if (!hasAnyValidProducts) {
        setDataError("No croffle products available. Please check your product catalog.");
      }
    }, 500);
  };

  const handleClose = () => {
    setStep("croffle");
    setSelectedCategory("Classic");
    setSelectedCroffle(null);
    setCustomizedCroffle(null);
    setMiniCroffleCustomization(null);
    setDataError(null);
    setIsRefreshing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
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

        <div className="overflow-y-auto flex-1">
          {/* Loading State */}
          {!isDataLoaded && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Loading products and categories...</p>
            </div>
          )}

          {/* Error State */}
          {isDataLoaded && !hasAnyValidProducts && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {dataError || "No croffle products are currently available. Please check your product catalog."}
                </AlertDescription>
              </Alert>
              <div className="flex justify-center">
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
                  Refresh Data
                </Button>
              </div>
            </div>
          )}

          {/* Normal Content */}
          {isDataLoaded && hasAnyValidProducts && step === "croffle" && (
            <div className="space-y-6">
              {/* Category Tabs */}
              <div className="flex gap-2 flex-wrap">
                {CROFFLE_CATEGORIES.map((category) => {
                  const categoryProducts = getCategoryProducts(category);
                  const hasProducts = categoryProducts.length > 0;
                  
                  return (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      disabled={!hasProducts}
                      className={`transition-all ${!hasProducts ? 'opacity-50' : ''}`}
                    >
                      {category} {!hasProducts && '(0)'}
                    </Button>
                  );
                })}
              </div>

              <Separator />

              {/* Croffle Products */}
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {getCategoryProducts(selectedCategory).map((product) => (
                  <div
                    key={product.id}
                    className="border rounded-lg p-3 hover:bg-accent/50 cursor-pointer transition-colors"
                    onClick={() => handleCroffleSelect(product)}
                  >
                    {product.image_url && (
                      <div className="aspect-square bg-muted rounded-md mb-2 overflow-hidden w-16 h-16 mx-auto">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
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

              {getCategoryProducts(selectedCategory).length === 0 && (
                <div className="text-center py-8 space-y-3">
                  <p className="text-muted-foreground">No products available in {selectedCategory} category</p>
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

          {isDataLoaded && hasAnyValidProducts && step === "espresso" && (
            <div className="space-y-6">
              {/* Espresso Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {espressoProducts.map((espresso) => {
                  const croffleCategory = categories.find(c => c.id === selectedCroffle?.category_id)?.name || "";
                  
                  // Fix category mapping for Mini Croffle in display
                  let categoryForPricing = croffleCategory;
                  if (selectedCroffle?.name.toLowerCase().includes("mini")) {
                    categoryForPricing = "Mini Croffle";
                  }
                  
                  // Map espresso product name to espresso type for pricing
                  let espressoType = "Hot Espresso"; // default
                  if (espresso.name.toLowerCase().includes("iced") || espresso.name.toLowerCase().includes("cold")) {
                    espressoType = "Iced Espresso";
                  }
                  
                  const comboPrice = getComboPrice(categoryForPricing, espressoType);
                  
                  return (
                    <div
                      key={espresso.id}
                      className="border rounded-lg p-6 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleEspressoSelect(espresso)}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        {espresso.name.includes("Iced") ? (
                          <IceCream className="h-8 w-8 text-blue-500" />
                        ) : (
                          <Coffee className="h-8 w-8 text-orange-500" />
                        )}
                        <div>
                          <h3 className="font-medium">{espresso.name}</h3>
                          <p className="text-sm text-muted-foreground">₱{espresso.price}</p>
                        </div>
                      </div>
                      
                      <Separator className="my-3" />
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Combo Price:</span>
                          <span className="font-semibold text-primary">₱{comboPrice}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Regular Price:</span>
                          <span>₱{(selectedCroffle?.price || 0) + espresso.price}</span>
                        </div>
                        <div className="flex justify-between text-xs text-green-600">
                          <span>You Save:</span>
                          <span>₱{((selectedCroffle?.price || 0) + espresso.price) - comboPrice}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
        </div>

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