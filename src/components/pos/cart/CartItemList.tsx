
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem } from "@/types";
import { formatCurrency } from "@/utils/format";

interface CartItemListProps {
  items: CartItem[];
  updateQuantity: (index: number, quantity: number) => void;
  removeItem: (index: number) => void;
  isShiftActive: boolean;
}

export default function CartItemList({ 
  items, 
  updateQuantity, 
  removeItem,
  isShiftActive 
}: CartItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Your cart is empty</p>
        <p className="text-sm">Select products to add them to your order</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item.productId}-${item.variationId || 'base'}`} className="bg-croffle-background/50 p-3 rounded-md">
          <div className="flex justify-between">
            <div className="flex-1">
              <p className="font-medium">{item.product.name}</p>
              {item.variation && (
                <Badge variant="outline" className="mt-1 bg-croffle-background">
                  {item.variation.name}
                </Badge>
              )}
            </div>
            <p className="font-semibold text-croffle-primary">
              {formatCurrency(item.price * item.quantity)}
            </p>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center">
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-full"
                onClick={() => updateQuantity(index, item.quantity - 1)}
                disabled={item.quantity <= 1 || !isShiftActive}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="mx-2 font-medium w-6 text-center">{item.quantity}</span>
              <Button 
                size="icon" 
                variant="outline" 
                className="h-8 w-8 rounded-full"
                onClick={() => updateQuantity(index, item.quantity + 1)}
                disabled={!isShiftActive}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => removeItem(index)}
              disabled={!isShiftActive}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
