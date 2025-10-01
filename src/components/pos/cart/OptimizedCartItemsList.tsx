import React, { memo, useCallback } from 'react';
import { CartItem } from '@/types';
import { EditableCartItem } from '../EditableCartItem';
import { OrderType, DeliveryPlatform } from '@/contexts/cart/CartContext';

interface CartItemsListProps {
  items: CartItem[];
  isTransitioning: boolean;
  orderType: OrderType;
  deliveryPlatform?: DeliveryPlatform | null;
  updateQuantity: (index: number, quantity: number) => void;
  updateItemPrice: (index: number, price: number) => void;
  removeItem: (index: number) => void;
  getItemValidation: (productId: string, variationId?: string) => any;
}

// Memoized individual cart item wrapper
const MemoizedCartItem = memo(function MemoizedCartItem({
  item,
  index,
  orderType,
  deliveryPlatform,
  updateQuantity,
  updateItemPrice,
  removeItem,
  getItemValidation
}: {
  item: CartItem;
  index: number;
  orderType: OrderType;
  deliveryPlatform?: DeliveryPlatform | null;
  updateQuantity: (index: number, quantity: number) => void;
  updateItemPrice: (index: number, price: number) => void;
  removeItem: (index: number) => void;
  getItemValidation: (productId: string, variationId?: string) => any;
}) {
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
      canEditPrice={orderType === 'online_delivery' && (deliveryPlatform === 'grab_food' || deliveryPlatform === 'food_panda')}
      deliveryPlatform={deliveryPlatform}
      hasStockIssue={hasStockIssue}
      validation={validation}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimal re-rendering
  return (
    prevProps.item === nextProps.item &&
    prevProps.item.quantity === nextProps.item.quantity &&
    prevProps.item.price === nextProps.item.price &&
    prevProps.orderType === nextProps.orderType &&
    prevProps.deliveryPlatform === nextProps.deliveryPlatform
  );
});

export const OptimizedCartItemsList = memo(function OptimizedCartItemsList({
  items,
  isTransitioning,
  orderType,
  deliveryPlatform,
  updateQuantity,
  updateItemPrice,
  removeItem,
  getItemValidation
}: CartItemsListProps) {
  console.log('⚡ [OPTIMIZED] CartItemsList: Render with', items?.length || 0, 'items');

  return (
    <div className="flex-1 overflow-hidden min-h-[200px]">
      <div className="h-full overflow-y-auto space-y-2 pr-2">
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
            {items.map((item, index) => (
              <MemoizedCartItem
                key={`${item.productId}-${item.variationId || 'default'}-${index}`}
                item={item}
                index={index}
                orderType={orderType}
                deliveryPlatform={deliveryPlatform}
                updateQuantity={updateQuantity}
                updateItemPrice={updateItemPrice}
                removeItem={removeItem}
                getItemValidation={getItemValidation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if items, order type, or delivery platform changes
  return (
    prevProps.items === nextProps.items &&
    prevProps.isTransitioning === nextProps.isTransitioning &&
    prevProps.orderType === nextProps.orderType &&
    prevProps.deliveryPlatform === nextProps.deliveryPlatform
  );
});
