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
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, ShoppingCart } from 'lucide-react';
import {
  AddonItem,
  SelectedAddon,
  AddonCategory,
  calculateAddonTotal,
  validateAddonSelection,
  createAddonCartItem,
  formatAddonDisplayName
} from '@/services/pos/addonService';
import { toast } from 'sonner';

interface AddonSelectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  addonCategories: AddonCategory[];
  productName?: string;
  onAddToCart: (addonItems: any[]) => void;
  recommendedAddons?: AddonItem[];
}

export const AddonSelectionDialog: React.FC<AddonSelectionDialogProps> = ({
  isOpen,
  onClose,
  addonCategories,
  productName = "item",
  onAddToCart,
  recommendedAddons = []
}) => {
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(addonCategories[0]?.name || '');

  // Reset selections when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAddons([]);
      setActiveCategory(addonCategories[0]?.name || '');
    }
  }, [isOpen, addonCategories]);

  const handleAddonQuantityChange = (addon: AddonItem, change: number) => {
    setSelectedAddons(prev => {
      const existing = prev.find(item => item.addon.id === addon.id);
      
      if (existing) {
        const newQuantity = existing.quantity + change;
        if (newQuantity <= 0) {
          // Remove addon if quantity becomes 0 or less
          return prev.filter(item => item.addon.id !== addon.id);
        } else {
          // Update quantity
          return prev.map(item =>
            item.addon.id === addon.id
              ? { ...item, quantity: newQuantity }
              : item
          );
        }
      } else if (change > 0) {
        // Add new addon
        return [...prev, { addon, quantity: change }];
      }
      
      return prev;
    });
  };

  const getAddonQuantity = (addonId: string): number => {
    const selected = selectedAddons.find(item => item.addon.id === addonId);
    return selected ? selected.quantity : 0;
  };

  const handleAddToCart = () => {
    if (selectedAddons.length === 0) {
      toast.error('Please select at least one addon');
      return;
    }

    const validation = validateAddonSelection(selectedAddons);
    if (!validation.isValid) {
      toast.error(validation.errors[0]);
      return;
    }

    // Create cart items for each selected addon
    const addonCartItems = selectedAddons.map(({ addon, quantity }) =>
      createAddonCartItem(addon, quantity)
    );

    onAddToCart(addonCartItems);
    
    const totalCost = calculateAddonTotal(selectedAddons);
    const addonNames = selectedAddons.map(({ addon, quantity }) => 
      formatAddonDisplayName(addon, quantity)
    ).join(', ');
    
    toast.success(`Added ${addonNames} (₱${totalCost.toFixed(2)}) to cart`);
    onClose();
  };

  const totalCost = calculateAddonTotal(selectedAddons);
  const selectedCount = selectedAddons.reduce((sum, item) => sum + item.quantity, 0);

  const renderAddonCard = (addon: AddonItem) => {
    const quantity = getAddonQuantity(addon.id);
    
    return (
      <Card key={addon.id} className="relative">
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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Add-ons for {productName}
          </DialogTitle>
          <DialogDescription>
            Enhance your order with delicious add-ons and toppings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2">
            {addonCategories.map((category) => (
              <Button
                key={category.name}
                variant={activeCategory === category.name ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category.name)}
              >
                {category.display_name}
              </Button>
            ))}
          </div>

          {/* Addon Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {addonCategories
              .find(cat => cat.name === activeCategory)
              ?.items.map(renderAddonCard) || (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No add-ons in this category
              </div>
            )}
          </div>

          {/* Selected Addons Summary */}
          {selectedAddons.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Selected Add-ons ({selectedCount} items)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {selectedAddons.map(({ addon, quantity }) => (
                    <div key={addon.id} className="flex justify-between items-center p-2 bg-muted rounded">
                      <span className="text-sm">
                        {formatAddonDisplayName(addon, quantity)}
                      </span>
                      <span className="text-sm font-medium">
                        ₱{(addon.price * quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="font-medium">Total Add-ons:</span>
                  <span className="font-bold text-lg">₱{totalCost.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Skip Add-ons
          </Button>
          <Button 
            onClick={handleAddToCart}
            disabled={selectedAddons.length === 0}
            className="min-w-[120px]"
          >
            Add to Cart
            {selectedCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedCount}
              </Badge>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
