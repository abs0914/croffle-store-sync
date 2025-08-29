import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Minus, Edit3, Check, X } from 'lucide-react';
import { CartItem } from '@/types';
import { DeliveryPlatform } from '@/contexts/cart/CartContext';

interface EditableCartItemProps {
  item: CartItem;
  index: number;
  quantity: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdatePrice: (index: number, price: number) => void;
  onRemoveItem: (index: number) => void;
  canEditPrice: boolean;
  deliveryPlatform?: DeliveryPlatform | null;
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
  deliveryPlatform,
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

  // Safe helper to extract addon names without using Array.map (to avoid crashing on undefined)
  const extractAddonNames = (list: any): string[] => {
    const names: string[] = [];
    if (Array.isArray(list)) {
      for (const entry of list) {
        const n = entry?.addon?.name;
        if (n) names.push(n);
      }
    }
    return names;
  };

  // Render customization details for both legacy and mix & match
  const renderCustomizationDetails = (): string | null => {
    try {
      const c: any = (item as any).customization;
      if (!c) return null;
      // Mix & Match croffle structure
      if (c.type === 'mix_match_croffle') {
        if (Array.isArray(c.addons) && c.addons.length > 0) {
          const parts: string[] = [];
          for (const a of c.addons) {
            const name = a?.addon?.name || '';
            if (name) parts.push(`${name}${a?.quantity ? ` x${a.quantity}` : ''}`);
          }
          return parts.length ? `Addons: ${parts.join(', ')}` : null;
        }
        const toppings = extractAddonNames(c?.combo?.toppings);
        const sauces = extractAddonNames(c?.combo?.sauces);
        const parts: string[] = [];
        if (toppings.length) parts.push(`Toppings: ${toppings.join(', ')}`);
        if (sauces.length) parts.push(`Sauces: ${sauces.join(', ')}`);
        return parts.length ? parts.join(' • ') : null;
      }
      // Legacy recipe customization
      if (Array.isArray(c.selected_choices)) {
        const names: string[] = [];
        for (const choice of c.selected_choices) {
          const n = choice?.selected_ingredient?.ingredient_name;
          if (n) names.push(n);
        }
        return names.length ? `Customized: ${names.join(', ')}` : null;
      }
      return null;
    } catch (err) {
      console.warn('EditableCartItem: Failed to render customization details', err);
      return null;
    }
  };

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
              {(() => {
                const c: any = (item as any).customization;
                if (c?.type === 'mix_match_croffle') {
                  // Use product base name + short summary for mix & match
                  const base = item.product?.name || 'Item';
                  const toppings = extractAddonNames(c?.combo?.toppings);
                  const sauces = extractAddonNames(c?.combo?.sauces);
                  const summary = [
                    toppings.length ? `+ ${toppings.join(', ')}` : null,
                    sauces.length ? `with ${sauces.join(', ')}` : null
                  ].filter(Boolean).join(' ');
                  return summary ? `${base} ${summary}` : base;
                }
                return item.customization ? (item.customization.display_name || item.product.name) : item.product.name;
              })()}
              {item.variation && !item.customization && (
                <span className="text-muted-foreground"> ({item.variation.name})</span>
              )}
            </h4>
            {(() => {
              const text = renderCustomizationDetails();
              return text ? (
                <div className="mt-1">
                  <p className="text-xs text-muted-foreground">{text}</p>
                </div>
              ) : null;
            })()}
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
              
              {/* Original vs Override Price Display */}
              {canEditPrice && deliveryPlatform && !isEditingPrice && (
                <p className="text-xs text-muted-foreground">
                  Platform: {deliveryPlatform === 'grab_food' ? 'Grab Food' : 'FoodPanda'} pricing
                </p>
              )}
              
              {canEditPrice && !isEditingPrice && (
                <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                  {deliveryPlatform === 'grab_food' && 'Grab Price Override'}
                  {deliveryPlatform === 'food_panda' && 'FoodPanda Price Override'}
                  {!deliveryPlatform && 'Price Editable'}
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