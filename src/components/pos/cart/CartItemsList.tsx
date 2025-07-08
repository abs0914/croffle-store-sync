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
    <div className="flex-1 bg-green-50 border border-green-300 rounded p-2">
      <div className="bg-blue-50 border border-blue-300 rounded p-2 min-h-[200px]">
        <p className="text-xs text-blue-800 mb-2">CART ITEMS CONTAINER - Items: {items?.length || 0}</p>
        
        {/* Show loading during transitions to prevent empty cart flicker */}
        {isTransitioning ? (
          <div className="text-center text-muted-foreground py-8 bg-yellow-100">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Updating cart...</span>
            </div>
          </div>
        ) : !items || items.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-red-100">
            <p>Your cart is empty</p>
            <p className="text-xs">Items: {items ? 'Empty array' : 'NULL'}</p>
          </div>
        ) : (
          <div className="space-y-2 bg-purple-50 p-2 rounded">
            <p className="text-xs text-purple-800">RENDERING {items.length} ITEMS:</p>
            {items.map((item, index) => {
              console.log('CartItemsList: Rendering item', { item, index, orderType });
              
              const validation = getItemValidation(item.productId, item.variationId);
              const hasStockIssue = validation && !validation.isValid;
              
              return (
                <div key={`${item.productId}-${item.variationId || 'default'}-${index}`} className="bg-white p-1 border border-gray-300 rounded">
                  <p className="text-xs text-gray-600 mb-1">Item {index + 1}: {item.product?.name}</p>
                  <EditableCartItem
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
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}