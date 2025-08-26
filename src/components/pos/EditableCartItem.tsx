import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, Edit3, Check, X } from 'lucide-react';
import { CartItem } from '@/types';

interface EditableCartItemProps {
  item: CartItem;
  index: number;
  quantity: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onRemoveItem: (index: number) => void;
  canEditPrice: boolean;
  hasStockIssue?: boolean;
  validation?: {
    isValid: boolean;
    insufficientItems: string[];
  };
}

export function EditableCartItem({
  item,
  index,
  quantity,
  onUpdateQuantity,
  onUpdatePrice,
  onRemoveItem,
  canEditPrice,
  hasStockIssue = false,
  validation
}: EditableCartItemProps) {
  // Debug logging
  console.log('EditableCartItem: Rendering item', {
    productName: item.product?.name,
    quantity,
    price: item.price,
    canEditPrice,
    hasStockIssue,
    index
  });
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState(item.price.toString());

  const handlePriceEdit = () => {
    const newPrice = parseFloat(editPrice);
    if (newPrice > 0) {
      onUpdatePrice(index, newPrice);
      setIsEditingPrice(false);
    }
  };

  const handleCancelEdit = () => {
    setEditPrice(item.price.toString());
    setIsEditingPrice(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePriceEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <Card className={hasStockIssue ? 'border-amber-200 bg-amber-50' : ''}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="font-medium text-sm">
              {item.customization ? item.customization.display_name : item.product.name}
              {item.variation && !item.customization && (
                <span className="text-muted-foreground"> ({item.variation.name})</span>
              )}
            </h4>
            {item.customization && (
              <div className="mt-1">
                <p className="text-xs text-muted-foreground">
                  Customized: {item.customization.selected_choices.map(choice =>
                    choice.selected_ingredient.ingredient_name
                  ).join(', ')}
                </p>
              </div>
            )}
            {hasStockIssue && validation && (
              <p className="text-xs text-amber-600 mt-1">
                Insufficient stock: {validation.insufficientItems.join(', ')}
              </p>
            )}
            
            {/* Price Display/Edit */}
            <div className="flex items-center gap-2 mt-1">
              {isEditingPrice ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">₱</span>
                  <Input
                    type="number"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-6 w-20 text-xs"
                    step="0.01"
                    min="0"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePriceEdit}
                    className="h-6 w-6 p-0"
                  >
                    <Check className="h-3 w-3 text-green-600" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCancelEdit}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3 text-red-600" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <p className="text-sm text-muted-foreground">
                    ₱{item.price.toFixed(2)} each
                  </p>
                  {canEditPrice && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingPrice(true)}
                      className="h-5 w-5 p-0 ml-1"
                    >
                      <Edit3 className="h-3 w-3 text-primary" />
                    </Button>
                  )}
                </div>
              )}
              {canEditPrice && !isEditingPrice && (
                <Badge variant="outline" className="text-xs">
                  Editable
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateQuantity(index, Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="w-8 text-center text-sm">{quantity}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateQuantity(index, quantity + 1)}
                disabled={hasStockIssue}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onRemoveItem(index)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-2">
          <span className="text-sm font-medium">
            ₱{(item.price * quantity).toFixed(2)}
          </span>
          {hasStockIssue && (
            <Badge variant="secondary" className="text-xs">
              Stock Issue
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}