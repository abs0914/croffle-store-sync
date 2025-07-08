import React from 'react';
import { CartItem } from '@/types';
import { EditableCartItem } from '../EditableCartItem';
import { OrderType } from '@/contexts/cart/CartContext';

interface CartItemsListProps {
  items: CartItem[];
  isTransitioning: boolean;
  orderType: OrderType;
  updateQuantity: (index: number, quantity: number) => void;
  updateItemPrice: (index: number, price: number) => void;
  removeItem: (index: number) => void;
  getItemValidation: (productId: string, variationId?: string) => any;
}

export function CartItemsList({
  items,
  isTransitioning,
  orderType,
  updateQuantity,
  updateItemPrice,
  removeItem,
  getItemValidation
}: CartItemsListProps) {
  return (
    <div className="flex-1 min-h-0 overflow-hidden">
      <div className="space-y-2 h-full overflow-y-auto">
        {/* Show loading during transitions to prevent empty cart flicker */}
        {isTransitioning ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Updating cart...</span>
            </div>
          </div>
        ) : items?.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
        ) : (
          items?.map((item, index) => {
            const validation = getItemValidation(item.productId, item.variationId);
            const hasStockIssue = validation && !validation.isValid;
            
            return (
              <EditableCartItem
                key={`${item.productId}-${item.variationId || 'default'}-${index}`}
                item={item}
                index={index}
                quantity={item.quantity}
                onUpdateQuantity={updateQuantity}
                onUpdatePrice={updateItemPrice}
                onRemoveItem={removeItem}
                canEditPrice={orderType === 'online_delivery'}
                hasStockIssue={hasStockIssue}
                validation={validation}
              />
            );
          }) || []
        )}
      </div>
    </div>
  );
}