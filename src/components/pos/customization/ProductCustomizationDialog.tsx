import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, ShoppingCart, CheckCircle } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Product } from '@/types';
import { ProductVariation } from '@/types';
import {
  AddonItem,
  AddonCategory,
  calculateAddonTotal,
  validateAddonSelection,
  SelectedAddon
} from '@/services/pos/addonService';
import { MixMatchRule, AddOnItem } from '@/types/productVariations';
import { fetchAddOnItems } from '@/services/productVariations/productVariationsService';
import { toast } from 'sonner';

export type CroffleType = 'regular' | 'overload' | 'mini';

interface ProductCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product & { selectedVariation?: ProductVariation } | null;
  addonCategories: AddonCategory[];
  comboRules: MixMatchRule[];
  onAddToCart: (items: any[]) => void;
}

interface ComboSelection {
  toppings: SelectedAddon[];
  sauces: SelectedAddon[];
}

export const ProductCustomizationDialog: React.FC<ProductCustomizationDialogProps> = ({
  isOpen,
  onClose,
  product,
  addonCategories,
  comboRules,
  onAddToCart
}) => {
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [comboSelection, setComboSelection] = useState<ComboSelection>({
    toppings: [],
    sauces: []
  });
  const [activeTab, setActiveTab] = useState<string>('toppings');
  const [dynamicAddons, setDynamicAddons] = useState<AddOnItem[]>([]);

  // Determine croffle type from product name
  const getCroffleType = (productName: string): CroffleType => {
    const name = productName.toLowerCase();
    if (name.includes('overload')) {
      return 'overload';
    } else if (name.includes('mini')) {
      return 'mini';
    }
    return 'regular';
  };

  const croffleType = product ? getCroffleType(product.name) : 'regular';

  // Reset selections when dialog opens and fetch dynamic addons
  useEffect(() => {
    if (isOpen) {
      setSelectedAddons([]);
      setComboSelection({ toppings: [], sauces: [] });
      setActiveTab('toppings');
      fetchDynamicAddons();
    }
  }, [isOpen]);

  const fetchDynamicAddons = async () => {
    try {
      const addons = await fetchAddOnItems();
      setDynamicAddons(addons);
    } catch (error) {
      console.error('Error fetching dynamic addons:', error);
      toast.error('Failed to load addon options');
    }
  };

  // Get relevant combo rules for current product
  const getRelevantComboRules = (): MixMatchRule[] => {
    return comboRules.filter(rule => 
      rule.is_active && 
      (rule.name.toLowerCase().includes('croffle') || 
       rule.base_item_category === 'croffle')
    );
  };

  // Get addons by category
  const getAddonsByCategory = (categoryName: string): AddonItem[] => {
    const category = addonCategories.find(cat => 
      cat.name.includes(categoryName) || cat.display_name.toLowerCase().includes(categoryName)
    );
    return category?.items || [];
  };

  // Get dynamic sauce and topping options for Mix & Match
  const getDynamicSauces = (): AddOnItem[] => {
    return dynamicAddons.filter(addon => 
      addon.category === 'classic_sauce' || addon.category === 'premium_sauce'
    );
  };

  const getDynamicToppings = (): AddOnItem[] => {
    return dynamicAddons.filter(addon => 
      addon.category === 'classic_topping' || addon.category === 'premium_topping'
    );
  };

  const mixMatchSauces = getDynamicSauces();
  const mixMatchToppings = getDynamicToppings();

  // For regular croffles, use addon categories (simplified)
  const classicToppings = croffleType === 'regular' ? getAddonsByCategory('basic_toppings') : [];
  const premiumToppings = croffleType === 'regular' ? getAddonsByCategory('premium_toppings') : [];
  const classicSauces = croffleType === 'regular' ? getAddonsByCategory('premium_spreads') : [];
  const premiumSauces = croffleType === 'regular' ? getAddonsByCategory('fruit_jams') : [];

  // Handle addon quantity changes for regular croffle
  const handleAddonQuantityChange = (addon: AddonItem, change: number) => {
    setSelectedAddons(prev => {
      const existing = prev.find(item => item.addon.id === addon.id);
      
      if (existing) {
        const newQuantity = existing.quantity + change;
        if (newQuantity <= 0) {
          return prev.filter(item => item.addon.id !== addon.id);
        } else {
          return prev.map(item =>
            item.addon.id === addon.id
              ? { ...item, quantity: newQuantity }
              : item
          );
        }
      } else if (change > 0) {
        return [...prev, { addon, quantity: change }];
      }
      
      return prev;
    });
  };

  // Handle combo selection based on product type
  const handleComboSelection = (type: 'toppings' | 'sauces', addon: AddOnItem, selected: boolean) => {
    setComboSelection(prev => {
      const currentSelection = prev[type];
      if (selected) {
        // Apply different limits based on croffle type and selection type
        let maxLimit = 3; // Default
        
        if (croffleType === 'overload' && type === 'toppings') {
          maxLimit = 1; // Croffle Overload: exactly 1 topping
        } else if (croffleType === 'mini' && type === 'sauces') {
          maxLimit = 1; // Mini Croffle: exactly 1 sauce
        }
        
        if (currentSelection.length >= maxLimit) {
          const limitText = maxLimit === 1 ? '1' : `${maxLimit}`;
          toast.error(`Maximum ${limitText} ${type} allowed for this product`);
          return prev;
        }
        
        // Convert AddOnItem to AddonItem for compatibility
        const compatibleAddon: AddonItem = {
          id: addon.id,
          name: addon.name,
          price: addon.price || 0,
          cost_per_unit: addon.cost_per_unit || 0,
          category: addon.category,
          is_active: addon.is_available
        };
        
        return {
          ...prev,
          [type]: [...currentSelection, { addon: compatibleAddon, quantity: 1 }]
        };
      } else {
        return {
          ...prev,
          [type]: currentSelection.filter(item => item.addon.id !== addon.id)
        };
      }
    });
  };

  const getAddonQuantity = (addonId: string): number => {
    const selected = selectedAddons.find(item => item.addon.id === addonId);
    return selected ? selected.quantity : 0;
  };

  const isComboItemSelected = (type: 'toppings' | 'sauces', addonId: string): boolean => {
    return comboSelection[type].some(item => item.addon.id === addonId);
  };

  // Calculate pricing
  const calculateTotal = (): number => {
    // Fixed prices for Mix & Match products - use product database price
    if (croffleType === 'overload' || croffleType === 'mini') {
      return product?.price || 0; // Get price from database
    }
    
    // For regular croffles, use base price + addons
    const basePrice = product?.price || 0;
    const variationPrice = (product as any)?.selectedVariation?.price || 0;
    return basePrice + variationPrice + calculateAddonTotal(selectedAddons);
  };

  const getComboPrice = (): number => {
    const relevantRules = getRelevantComboRules();
    if (relevantRules.length > 0) {
      // Use the first applicable combo rule
      return relevantRules[0].mix_match_price;
    }
    
    // Fallback to individual pricing with discount
    const toppingsCost = comboSelection.toppings.reduce((sum, item) => sum + (item.addon.price * 0.8), 0);
    const saucesCost = comboSelection.sauces.reduce((sum, item) => sum + (item.addon.price * 0.8), 0);
    return toppingsCost + saucesCost;
  };

  // Check if selection is valid based on product type
  const isSelectionValid = (): boolean => {
    if (croffleType === 'regular') {
      return true; // Regular can have any addons or none
    } else if (croffleType === 'mini') {
      // Mini Croffle: Must have 1 sauce + at least 1 topping
      return comboSelection.sauces.length === 1 && comboSelection.toppings.length > 0;
    } else if (croffleType === 'overload') {
      // Croffle Overload: Must have exactly 1 topping
      return comboSelection.toppings.length === 1;
    }
    return false;
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (!isSelectionValid()) {
      if (croffleType === 'mini') {
        toast.error('Please select exactly 1 sauce and at least 1 topping for Mini Croffle');
      } else if (croffleType === 'overload') {
        toast.error('Please select exactly 1 topping for Croffle Overload');
      } else {
        toast.error('Please make a valid selection');
      }
      return;
    }

    const items = [];
    
    // Add main product
    const mainItem = {
      id: `${product.id}-${Date.now()}`,
      productId: product.id,
      product: {
        ...product,
        name: generateCustomizedName(),
        price: calculateTotal()
      },
      quantity: 1,
      price: calculateTotal(),
      customization: {
        croffleType,
        addons: croffleType === 'regular' ? selectedAddons : [],
        combo: croffleType !== 'regular' ? comboSelection : null
      }
    };
    
    items.push(mainItem);
    
    onAddToCart(items);
    toast.success(`${generateCustomizedName()} added to cart`);
    onClose();
  };

  const generateCustomizedName = (): string => {
    if (!product) return '';
    
    let name = product.name;
    
    if (croffleType === 'regular' && selectedAddons.length > 0) {
      const addonNames = selectedAddons.map(item => item.addon.name).join(', ');
      name += ` with ${addonNames}`;
    } else if (croffleType !== 'regular') {
      const toppingNames = comboSelection.toppings.map(item => item.addon.name);
      const sauceNames = comboSelection.sauces.map(item => item.addon.name);
      
      if (toppingNames.length > 0) {
        name += ` with ${toppingNames.join(', ')}`;
      }
      if (sauceNames.length > 0) {
        name += ` and ${sauceNames.join(', ')}`;
      }
    }
    
    return name;
  };

  const renderAddonCard = (addon: AddonItem, isCombo: boolean = false, type?: 'toppings' | 'sauces') => {
    if (isCombo && type) {
      const isSelected = isComboItemSelected(type, addon.id);
      
      // Convert AddonItem to AddOnItem format
      const convertedAddon: AddOnItem = {
        id: addon.id,
        name: addon.name,
        category: addon.category as any,
        price: addon.price,
        cost_per_unit: addon.cost_per_unit,
        is_available: addon.is_active,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return (
        <Card 
          key={addon.id} 
          className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
          onClick={() => handleComboSelection(type, convertedAddon, !isSelected)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{addon.name}</h4>
                <p className="text-xs text-muted-foreground">₱{addon.price || 0}</p>
              </div>
              {isSelected && (
                <CheckCircle className="h-5 w-5 text-primary" />
              )}
            </div>
          </CardContent>
        </Card>
      );
    } else {
      // Regular addon selection
      const quantity = getAddonQuantity(addon.id);
      
      return (
        <Card key={addon.id}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{addon.name}</h4>
                <p className="text-xs text-muted-foreground">₱{addon.price || 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleAddonQuantityChange(addon, -1)}
                  disabled={quantity === 0}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center text-sm font-medium">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleAddonQuantityChange(addon, 1)}
                  disabled={quantity >= 10}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {quantity > 0 && (
              <div className="text-xs text-green-600 font-medium">
                Subtotal: ₱{((addon.price || 0) * quantity).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
  };

  // Render mix & match cards for dynamic addon options
  const renderMixMatchCard = (item: AddOnItem, type: 'toppings' | 'sauces') => {
    const isSelected = comboSelection[type].some(selected => selected.addon.id === item.id);
    
    return (
      <div 
        key={item.id} 
        className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
        onClick={() => handleComboSelection(type, item, !isSelected)}
      >
        <Checkbox
          id={`${type}-${item.id}`}
          checked={isSelected}
          onCheckedChange={() => {}} // Handled by parent onClick
          className="h-4 w-4"
        />
        <Label 
          htmlFor={`${type}-${item.id}`}
          className="flex-1 cursor-pointer text-sm font-medium"
        >
          {item.name}
        </Label>
        {item.price && item.price > 0 && (
          <span className="text-xs text-muted-foreground">
            ₱{(item.price || 0).toFixed(2)}
          </span>
        )}
      </div>
    );
  };

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Customize {product.name}
          </DialogTitle>
          <DialogDescription>
            {croffleType === 'regular' 
              ? 'Select add-ons to enhance your croffle'
              : croffleType === 'mini'
              ? 'Select exactly 1 sauce and multiple toppings for your Mini Croffle'
              : 'Select exactly 1 topping for your Croffle Overload'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {croffleType !== 'regular' 
                      ? `Fixed Price: ₱${product.price}` 
                      : `Base Price: ₱${product.price}`
                    }
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {croffleType.replace('_', ' ')}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {croffleType === 'regular' ? (
            /* Regular Croffle - Show all addon categories */
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Toppings</TabsTrigger>
                <TabsTrigger value="premium">Premium Toppings</TabsTrigger>
                <TabsTrigger value="spreads">Spreads</TabsTrigger>
                <TabsTrigger value="jams">Jams</TabsTrigger>
              </TabsList>
              
              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {classicToppings.map(addon => renderAddonCard(addon, false))}
                </div>
              </TabsContent>
              
              <TabsContent value="premium" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {premiumToppings.map(addon => renderAddonCard(addon, false))}
                </div>
              </TabsContent>
              
              <TabsContent value="spreads" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {classicSauces.map(addon => renderAddonCard(addon, false))}
                </div>
              </TabsContent>
              
              <TabsContent value="jams" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {premiumSauces.map(addon => renderAddonCard(addon, false))}
                </div>
              </TabsContent>
            </Tabs>
          ) : (
            /* Mix & Match Croffles - Show sauce and topping selection */
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="toppings">Toppings</TabsTrigger>
                  <TabsTrigger value="sauces">Sauces</TabsTrigger>
                </TabsList>
                
                <TabsContent value="toppings" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Select Toppings</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {croffleType === 'overload' 
                        ? 'Choose exactly 1 topping for your Croffle Overload'
                        : croffleType === 'mini'
                        ? 'Choose multiple toppings for your Mini Croffle'
                        : 'Choose up to 3 toppings for your croffle'
                      }
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {mixMatchToppings.map(topping => renderMixMatchCard(topping, 'toppings'))}
                      {mixMatchToppings.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Loading toppings...
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="sauces" className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3">Select Sauces</h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      {croffleType === 'mini' 
                        ? 'Choose exactly 1 sauce for your Mini Croffle'
                        : 'Choose up to 3 sauces for your croffle'
                      }
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {mixMatchSauces.map(sauce => renderMixMatchCard(sauce, 'sauces'))}
                      {mixMatchSauces.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Loading sauces...
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>
               </Tabs>
            </div>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="space-y-3">
            <h4 className="font-medium">Order Summary</h4>
             <div className="space-y-2">
               {croffleType === 'regular' ? (
                 <>
                   <div className="flex justify-between">
                     <span>Base {product.name}</span>
                     <span>₱{product.price}</span>
                   </div>
                   {selectedAddons.length > 0 && (
                     selectedAddons.map(({ addon, quantity }) => (
                       <div key={addon.id} className="flex justify-between text-sm">
                         <span>{addon.name} x{quantity}</span>
                         <span>₱{(addon.price * quantity).toFixed(2)}</span>
                       </div>
                     ))
                   )}
                 </>
               ) : (
                 <>
                   <div className="flex justify-between">
                     <span>Base {product.name}</span>
                     <span>₱{calculateTotal()}</span>
                   </div>
                   
                    {comboSelection.sauces.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Selected Sauces:</div>
                        {comboSelection.sauces.map(({ addon }) => (
                          <div key={addon.id} className="text-sm pl-2">
                            <span>• {addon.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {comboSelection.toppings.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-muted-foreground">Selected Toppings:</div>
                        {comboSelection.toppings.map(({ addon }) => (
                          <div key={addon.id} className="text-sm pl-2">
                            <span>• {addon.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
             </div>
             
             <Separator />
             
             <div className="flex justify-between font-medium text-lg">
               <span>Total</span>
               <span>₱{calculateTotal().toFixed(2)}</span>
             </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddToCart}
            disabled={!isSelectionValid()}
            className="flex items-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Add to Cart - ₱{calculateTotal().toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};