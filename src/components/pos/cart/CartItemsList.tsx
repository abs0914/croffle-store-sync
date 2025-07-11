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
  // Debug logging to track what data we receive
  console.log('CartItemsList: Render with data', {
    itemsLength: items?.length || 0,
    itemsArray: items,
    isTransitioning,
    orderType,
    actualItems: items?.map(item => ({ 
      id: item.productId, 
      name: item.product?.name,
      quantity: item.quantity,
      price: item.price 
    }))
  });

  return (
    <div className="flex-1 overflow-hidden min-h-[200px]">
      <div className="h-full overflow-y-auto space-y-2 pr-2">
        {/* Show loading during transitions to prevent empty cart flicker */}
        {isTransitioning ? (
          <div className="text-center text-muted-foreground py-8">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Updating cart...</span>
            </div>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Your cart is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              console.log('CartItemsList: Rendering item', { item, index, orderType });
              
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}