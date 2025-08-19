import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DeliveryPlatform } from '@/contexts/cart/CartContext';
import { DeliveryPlatformPricingService } from '@/services/pricing/DeliveryPlatformPricingService';
import { useCart } from '@/contexts/cart/CartContext';
import { toast } from 'sonner';
import { Calculator, DollarSign } from 'lucide-react';

interface BulkPricingOverrideProps {
  platform: DeliveryPlatform;
}

export function BulkPricingOverride({ platform }: BulkPricingOverrideProps) {
  const { items, updateItemPrice } = useCart();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [previewOverrides, setPreviewOverrides] = useState<any[]>([]);

  const platformName = DeliveryPlatformPricingService.getPlatformDisplayName(platform);

  const calculatePriceOverrides = () => {
    const overrides = DeliveryPlatformPricingService.applyBulkPlatformPricing(items, platform);
    setPreviewOverrides(overrides);
  };

  const applyPriceOverrides = () => {
    previewOverrides.forEach((override, index) => {
      updateItemPrice(index, override.overriddenPrice);
    });
    
    toast.success(`Applied ${platformName} pricing to ${previewOverrides.length} items`);
    setIsDialogOpen(false);
    setPreviewOverrides([]);
  };

  const totalOriginalPrice = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalNewPrice = previewOverrides.reduce((sum, override, index) => 
    sum + (override.overriddenPrice * items[index].quantity), 0
  );
  const priceDifference = totalNewPrice - totalOriginalPrice;

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={calculatePriceOverrides}
          className="flex items-center gap-2"
        >
          <Calculator className="h-3 w-3" />
          Apply {platformName} Pricing
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            {platformName} Bulk Price Override
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {previewOverrides.length > 0 ? (
            <>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {previewOverrides.map((override, index) => {
                  const item = items[index];
                  return (
                    <Card key={index} className="p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-sm">{item.product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through text-muted-foreground">
                              ₱{override.originalPrice.toFixed(2)}
                            </span>
                            <span className="text-sm font-medium text-primary">
                              ₱{override.overriddenPrice.toFixed(2)}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {override.reason}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between text-sm">
                  <span>Original Total:</span>
                  <span>₱{totalOriginalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>New Total:</span>
                  <span className="font-medium">₱{totalNewPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-medium">
                  <span>Difference:</span>
                  <span className={priceDifference >= 0 ? "text-green-600" : "text-red-600"}>
                    {priceDifference >= 0 ? "+" : ""}₱{priceDifference.toFixed(2)}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={applyPriceOverrides} className="flex-1">
                  Apply Changes
                </Button>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pricing adjustments needed for {platformName}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}