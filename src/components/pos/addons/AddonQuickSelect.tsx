import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, ShoppingCart } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AddonItem,
  SelectedAddon,
  calculateAddonTotal,
  createAddonCartItem,
  formatAddonDisplayName
} from '@/services/pos/addonService';
import { toast } from 'sonner';

interface AddonQuickSelectProps {
  recommendedAddons: AddonItem[];
  onAddToCart: (addonItems: any[]) => void;
  productName: string;
  disabled?: boolean;
}

export const AddonQuickSelect: React.FC<AddonQuickSelectProps> = ({
  recommendedAddons,
  onAddToCart,
  productName,
  disabled = false
}) => {
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleAddonToggle = (addon: AddonItem) => {
    setSelectedAddons(prev => {
      const existing = prev.find(item => item.addon.id === addon.id);
      
      if (existing) {
        // Remove addon
        return prev.filter(item => item.addon.id !== addon.id);
      } else {
        // Add addon with quantity 1
        return [...prev, { addon, quantity: 1 }];
      }
    });
  };

  const isAddonSelected = (addonId: string): boolean => {
    return selectedAddons.some(item => item.addon.id === addonId);
  };

  const handleQuickAdd = () => {
    if (selectedAddons.length === 0) {
      toast.error('Please select at least one addon');
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
    
    // Reset and close
    setSelectedAddons([]);
    setIsOpen(false);
  };

  const totalCost = calculateAddonTotal(selectedAddons);
  const selectedCount = selectedAddons.length;

  if (recommendedAddons.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2"
          disabled={disabled}
        >
          <Plus className="h-3 w-3 mr-1" />
          Quick Add-ons
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Quick Add-ons for {productName}</h4>
            {selectedCount > 0 && (
              <Badge variant="secondary">{selectedCount} selected</Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {recommendedAddons.slice(0, 6).map((addon) => (
              <Button
                key={addon.id}
                variant={isAddonSelected(addon.id) ? "default" : "outline"}
                size="sm"
                className="h-auto p-2 flex flex-col items-center text-xs"
                onClick={() => handleAddonToggle(addon)}
              >
                <span className="font-medium">{addon.name}</span>
                <span className="text-xs opacity-75">₱{addon.price}</span>
              </Button>
            ))}
          </div>

          {selectedCount > 0 && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex justify-between text-sm">
                <span>Total:</span>
                <span className="font-medium">₱{totalCost.toFixed(2)}</span>
              </div>
              <Button
                onClick={handleQuickAdd}
                size="sm"
                className="w-full"
              >
                <ShoppingCart className="h-3 w-3 mr-1" />
                Add to Cart
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
