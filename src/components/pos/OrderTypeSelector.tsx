
import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Store, Truck } from 'lucide-react';
import { OrderType, DeliveryPlatform } from '@/contexts/cart/CartContext';

interface OrderTypeSelectorProps {
  orderType: OrderType;
  onOrderTypeChange: (orderType: OrderType) => void;
  deliveryPlatform: DeliveryPlatform | null;
  onDeliveryPlatformChange: (platform: DeliveryPlatform | null) => void;
  deliveryOrderNumber: string;
  onDeliveryOrderNumberChange: (orderNumber: string) => void;
}

const deliveryPlatformOptions = [
  { value: 'grab_food', label: 'Grab Food' },
  { value: 'food_panda', label: 'Food Panda' }
];

export function OrderTypeSelector({
  orderType,
  onOrderTypeChange,
  deliveryPlatform,
  onDeliveryPlatformChange,
  deliveryOrderNumber,
  onDeliveryOrderNumberChange
}: OrderTypeSelectorProps) {
  const handleOrderTypeChange = (value: string) => {
    const newOrderType = value as OrderType;
    onOrderTypeChange(newOrderType);
    
    // Reset delivery fields when switching to dine in
    if (newOrderType === 'dine_in') {
      onDeliveryPlatformChange(null);
      onDeliveryOrderNumberChange('');
    }
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="order-type" className="text-sm font-medium">
            Order Type
          </Label>
          <Select value={orderType} onValueChange={handleOrderTypeChange}>
            <SelectTrigger id="order-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dine_in">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4" />
                  <span>Dine In</span>
                </div>
              </SelectItem>
              <SelectItem value="online_delivery">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  <span>Online Food Delivery</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {orderType === 'online_delivery' && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="delivery-platform" className="text-sm font-medium">
                  Delivery Platform <span className="text-destructive">*</span>
                </Label>
                <Select 
                  value={deliveryPlatform || ''} 
                  onValueChange={(value) => onDeliveryPlatformChange(value as DeliveryPlatform)}
                >
                  <SelectTrigger id="delivery-platform">
                    <SelectValue placeholder="Select delivery platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {deliveryPlatformOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="delivery-order-number" className="text-sm font-medium">
                  Order Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="delivery-order-number"
                  value={deliveryOrderNumber}
                  onChange={(e) => onDeliveryOrderNumberChange(e.target.value)}
                  placeholder="Enter delivery platform order number"
                  className="w-full"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
