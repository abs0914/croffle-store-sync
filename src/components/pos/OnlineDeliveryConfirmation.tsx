import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Package, X } from 'lucide-react';
import { DeliveryPlatform } from '@/contexts/cart/CartContext';

interface OnlineDeliveryConfirmationProps {
  total: number;
  itemCount: number;
  platform: DeliveryPlatform;
  orderNumber: string;
  onConfirm: () => Promise<boolean>;
  onCancel: () => void;
}

const platformDisplayNames: Record<DeliveryPlatform, string> = {
  grab_food: 'Grab Food',
  food_panda: 'FoodPanda'
};

const platformColors: Record<DeliveryPlatform, string> = {
  grab_food: 'bg-green-500',
  food_panda: 'bg-pink-500'
};

export function OnlineDeliveryConfirmation({
  total,
  itemCount,
  platform,
  orderNumber,
  onConfirm,
  onCancel
}: OnlineDeliveryConfirmationProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = async () => {
    setIsProcessing(true);
    try {
      await onConfirm();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Confirm Online Order</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Payment Status */}
      <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
        <div className="text-center space-y-3">
          <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
          <div>
            <p className="text-lg font-semibold text-green-700 dark:text-green-300">
              Payment Received via {platformDisplayNames[platform]}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Customer has already paid through the app
            </p>
          </div>
        </div>
      </div>

      {/* Order Details */}
      <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${platformColors[platform]}`}>
            <Package className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Platform</p>
            <p className="font-medium">{platformDisplayNames[platform]}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm text-muted-foreground">Order Number</span>
          <span className="font-mono font-semibold">{orderNumber}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm text-muted-foreground">Items</span>
          <span className="font-medium">{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-t">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-bold">₱{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Action Button */}
      <Button
        onClick={handleConfirm}
        className="w-full"
        size="lg"
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Confirm Order'}
      </Button>
    </div>
  );
}
