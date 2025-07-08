import React from 'react';
import { Button } from '@/components/ui/button';

interface CartHeaderProps {
  itemCount: number;
  onClearCart: () => void;
}

export function CartHeader({ itemCount, onClearCart }: CartHeaderProps) {
  return (
    <div className="flex items-center justify-between flex-shrink-0">
      <h3 className="text-lg font-semibold">Cart</h3>
      {itemCount > 0 && (
        <Button variant="outline" size="sm" onClick={onClearCart}>
          Clear Cart
        </Button>
      )}
    </div>
  );
}