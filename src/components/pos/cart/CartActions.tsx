import React from 'react';
import { Button } from '@/components/ui/button';
import { OrderType, DeliveryPlatform } from '@/contexts/cart/CartContext';
import { BulkPricingOverride } from '../BulkPricingOverride';

interface CartActionsProps {
  canCheckout: boolean;
  isShiftActive: boolean;
  isValidating: boolean;
  validationMessage: string;
  orderType: OrderType;
  deliveryPlatform: DeliveryPlatform | null;
  deliveryOrderNumber: string;
  onCheckout: () => void;
}

export function CartActions({
  canCheckout,
  isShiftActive,
  isValidating,
  validationMessage,
  orderType,
  deliveryPlatform,
  deliveryOrderNumber,
  onCheckout
}: CartActionsProps) {
  const isDeliveryOrderValid = orderType === 'dine_in' || 
    (orderType === 'online_delivery' && deliveryPlatform && deliveryOrderNumber.trim());

  return (
    <div className="space-y-2 pt-2">
      {/* Bulk Pricing Override - Show when delivery platform is selected */}
      {orderType === 'online_delivery' && deliveryPlatform && (
        <BulkPricingOverride platform={deliveryPlatform} />
      )}
      
      <Button
        onClick={onCheckout}
        className="w-full"
        disabled={!canCheckout}
        size="lg"
      >
        {!isShiftActive ? 'Start Shift to Checkout' : 
         isValidating ? 'Validating Stock...' :
         validationMessage ? 'Fix Stock Issues' :
         !isDeliveryOrderValid ? 'Complete Delivery Info' :
         'Proceed to Payment'}
      </Button>
      
      {/* Delivery validation message */}
      {orderType === 'online_delivery' && !isDeliveryOrderValid && (
        <p className="text-xs text-center text-destructive">
          Please select delivery platform and enter order number
        </p>
      )}
    </div>
  );
}