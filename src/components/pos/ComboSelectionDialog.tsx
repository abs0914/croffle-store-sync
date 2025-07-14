import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Coffee, IceCream } from "lucide-react";
import { Product, Category } from "@/types/product";
import { useComboService } from "@/hooks/pos/useComboService";
import { MiniCroffleComboDialog } from "./MiniCroffleComboDialog";
import { UnifiedProduct } from "@/services/product/unifiedProductService";
import { AddonCategory } from "@/services/pos/addonService";
import { MixMatchRule } from "@/types/productVariations";

interface ComboSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Product[];
  categories: Category[];
  addonCategories?: AddonCategory[];
  comboRules?: MixMatchRule[];
  onAddToCart: (comboData: {
    croffle: Product;
    espresso: Product;
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
  const [selectedCroffle, setSelectedCroffle] = useState<Product | null>(null);
  const [customizedCroffle, setCustomizedCroffle] = useState<any>(null);
  const [miniCroffleCustomization, setMiniCroffleCustomization] = useState<any>(null);
  const { getComboPrice, getEspressoProducts } = useComboService();

  const getCategoryProducts = (categoryName: string) => {
    // Special case for Mini Croffle - filter products by name containing "Mini"
    if (categoryName === "Mini Croffle") {
      return products.filter(p => 
        p.name.toLowerCase().includes("mini") && 
        p.is_active
      );
    }
    
    const category = categories.find(c => c.name === categoryName);
    if (!category) return [];
    
    return products.filter(p => p.category_id === category.id && p.is_active);
  };

  const espressoProducts = getEspressoProducts(products, categories);

  const handleCroffleSelect = (croffle: Product) => {
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

  const handleEspressoSelect = (espresso: Product) => {
    const croffleToUse = customizedCroffle || selectedCroffle;
    if (!croffleToUse) return;

    // Debug category mapping
    const croffleCategory = categories.find(c => c.id === selectedCroffle?.category_id)?.name || "";
    console.log('Debug combo pricing:', {
      selectedCroffle: selectedCroffle?.name,
      croffleCategory,
      productName: selectedCroffle?.name,
      isMini: selectedCroffle?.name.toLowerCase().includes("mini"),
      espressoName: espresso.name
    });

    // Fix category mapping for Mini Croffle
    let categoryForPricing = croffleCategory;
    if (selectedCroffle?.name.toLowerCase().includes("mini")) {
      categoryForPricing = "Mini Croffle";
    }

    const comboPrice = getComboPrice(categoryForPricing, espresso.name);
    const comboName = `${croffleToUse.product?.name || croffleToUse.name} + ${espresso.name}`;

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

  const handleClose = () => {
    setStep("croffle");
    setSelectedCategory("Classic");
    setSelectedCroffle(null);
    setCustomizedCroffle(null);
    setMiniCroffleCustomization(null);
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
          {step === "croffle" ? (
            <div className="space-y-6">
              {/* Category Tabs */}
              <div className="flex gap-2 flex-wrap">
                {CROFFLE_CATEGORIES.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                    className="transition-all"
                  >
                    {category}
                  </Button>
                ))}
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
                <div className="text-center py-8 text-muted-foreground">
                  No products available in {selectedCategory} category
                </div>
              )}
            </div>
          ) : step === "espresso" ? (
            <div className="space-y-6">
              {/* Espresso Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {espressoProducts.map((espresso) => {
                  const croffleCategory = categories.find(c => c.id === selectedCroffle?.category_id)?.name || "";
                  const comboPrice = getComboPrice(croffleCategory, espresso.name);
                  
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
                <div className="text-center py-8 text-muted-foreground">
                  No espresso products available
                </div>
              )}
            </div>
          ) : null}
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