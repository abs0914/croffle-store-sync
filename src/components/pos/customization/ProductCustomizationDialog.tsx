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
import { UnifiedProduct } from '@/services/product/unifiedProductService';
import { ProductVariation } from '@/types';
import {
  AddonItem,
  AddonCategory,
  calculateAddonTotal,
  validateAddonSelection,
  SelectedAddon
} from '@/services/pos/addonService';
import { ComboRule } from '@/types/productVariations';
import { toast } from 'sonner';

export type CroffleType = 'regular' | 'overload' | 'mini_overload';

interface ProductCustomizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  product: UnifiedProduct & { selectedVariation?: ProductVariation } | null;
  addonCategories: AddonCategory[];
  comboRules: ComboRule[];
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

  // Determine croffle type from product name
  const getCroffleType = (productName: string): CroffleType => {
    const name = productName.toLowerCase();
    if (name.includes('mini') && name.includes('overload')) {
      return 'mini_overload';
    } else if (name.includes('overload')) {
      return 'overload';
    }
    return 'regular';
  };

  const croffleType = product ? getCroffleType(product.name) : 'regular';

  // Reset selections when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAddons([]);
      setComboSelection({ toppings: [], sauces: [] });
      setActiveTab('toppings');
    }
  }, [isOpen]);

  // Get relevant combo rules for current product
  const getRelevantComboRules = (): ComboRule[] => {
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

  const classicToppings = getAddonsByCategory('basic_toppings');
  const premiumToppings = getAddonsByCategory('premium_toppings');
  const classicSauces = getAddonsByCategory('premium_spreads');
  const premiumSauces = getAddonsByCategory('fruit_jams');

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

  // Handle combo selection for overload variants
  const handleComboSelection = (type: 'toppings' | 'sauces', addon: AddonItem, selected: boolean) => {
    setComboSelection(prev => {
      const currentSelection = prev[type];
      if (selected) {
        // Check limits based on croffle type
        const maxToppings = croffleType === 'overload' ? 3 : 2;
        const maxSauces = croffleType === 'mini_overload' ? 2 : 0;
        
        if (type === 'toppings' && currentSelection.length >= maxToppings) {
          toast.error(`Maximum ${maxToppings} toppings allowed`);
          return prev;
        }
        if (type === 'sauces' && currentSelection.length >= maxSauces) {
          toast.error(`Maximum ${maxSauces} sauces allowed`);
          return prev;
        }
        
        return {
          ...prev,
          [type]: [...currentSelection, { addon, quantity: 1 }]
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
    const basePrice = product?.price || 0;
    const variationPrice = (product as any)?.selectedVariation?.price || 0;
    
    if (croffleType === 'regular') {
      return basePrice + variationPrice + calculateAddonTotal(selectedAddons);
    } else {
      // For combo items, use combo pricing
      const comboPrice = getComboPrice();
      return basePrice + variationPrice + comboPrice;
    }
  };

  const getComboPrice = (): number => {
    const relevantRules = getRelevantComboRules();
    if (relevantRules.length > 0) {
      // Use the first applicable combo rule
      return relevantRules[0].combo_price;
    }
    
    // Fallback to individual pricing with discount
    const toppingsCost = comboSelection.toppings.reduce((sum, item) => sum + (item.addon.price * 0.8), 0);
    const saucesCost = comboSelection.sauces.reduce((sum, item) => sum + (item.addon.price * 0.8), 0);
    return toppingsCost + saucesCost;
  };

  // Check if selection is valid
  const isSelectionValid = (): boolean => {
    if (croffleType === 'regular') {
      return true; // Regular can have any addons or none
    } else if (croffleType === 'overload') {
      return comboSelection.toppings.length >= 2; // Minimum 2 toppings
    } else if (croffleType === 'mini_overload') {
      return comboSelection.toppings.length >= 1 && comboSelection.sauces.length >= 1; // At least 1 of each
    }
    return false;
  };

  const handleAddToCart = () => {
    if (!product) return;

    if (!isSelectionValid()) {
      if (croffleType === 'overload') {
        toast.error('Please select at least 2 toppings for Croffle Overload');
      } else if (croffleType === 'mini_overload') {
        toast.error('Please select at least 1 topping and 1 sauce for Mini Croffle Overload');
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
      
      return (
        <Card 
          key={addon.id} 
          className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary bg-primary/5' : 'hover:shadow-md'}`}
          onClick={() => handleComboSelection(type, addon, !isSelected)}
        >
          <CardContent className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm">{addon.name}</h4>
                <p className="text-xs text-muted-foreground">₱{addon.price}</p>
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
                <p className="text-xs text-muted-foreground">₱{addon.price}</p>
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
                Subtotal: ₱{(addon.price * quantity).toFixed(2)}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }
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
            {croffleType === 'regular' && 'Select add-ons to enhance your croffle'}
            {croffleType === 'overload' && 'Choose 2-3 toppings for your Croffle Overload combo'}
            {croffleType === 'mini_overload' && 'Choose toppings and sauces for your Mini Croffle Overload combo'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-sm text-muted-foreground">Base Price: ₱{product.price}</p>
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
            /* Combo Croffles - Show combo selection */
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="toppings">
                  Toppings ({comboSelection.toppings.length}/{croffleType === 'overload' ? '3' : '2'})
                </TabsTrigger>
                {croffleType === 'mini_overload' && (
                  <TabsTrigger value="sauces">
                    Sauces ({comboSelection.sauces.length}/2)
                  </TabsTrigger>
                )}
              </TabsList>
              
              <TabsContent value="toppings" className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Basic Toppings</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {classicToppings.map(addon => renderAddonCard(addon, true, 'toppings'))}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Premium Toppings</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {premiumToppings.map(addon => renderAddonCard(addon, true, 'toppings'))}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {croffleType === 'mini_overload' && (
                <TabsContent value="sauces" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Spreads</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {classicSauces.map(addon => renderAddonCard(addon, true, 'sauces'))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Fruit Jams</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {premiumSauces.map(addon => renderAddonCard(addon, true, 'sauces'))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}
            </Tabs>
          )}

          <Separator />

          {/* Order Summary */}
          <div className="space-y-3">
            <h4 className="font-medium">Order Summary</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Base {product.name}</span>
                <span>₱{product.price}</span>
              </div>
              
              {croffleType === 'regular' && selectedAddons.length > 0 && (
                selectedAddons.map(({ addon, quantity }) => (
                  <div key={addon.id} className="flex justify-between text-sm">
                    <span>{addon.name} x{quantity}</span>
                    <span>₱{(addon.price * quantity).toFixed(2)}</span>
                  </div>
                ))
              )}
              
              {croffleType !== 'regular' && (
                <div className="flex justify-between text-sm">
                  <span>Combo Selection</span>
                  <span>₱{getComboPrice().toFixed(2)}</span>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-center font-bold text-lg">
              <span>Total:</span>
              <span>₱{calculateTotal().toFixed(2)}</span>
            </div>
            
            <p className="text-sm text-muted-foreground">{generateCustomizedName()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddToCart}
            disabled={!isSelectionValid()}
            className="min-w-[120px]"
          >
            Add to Cart - ₱{calculateTotal().toFixed(2)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};