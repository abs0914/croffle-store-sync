
import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import CartView from "./CartView";
import { CartItem, Customer } from "@/types";
import { SeniorDiscount } from "@/hooks/useTransactionHandler";
import { useCart } from "@/contexts/cart/CartContext";

interface MobileCartDrawerProps {
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string }) => void;
  handlePaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet', 
    amountTendered: number, 
    paymentDetails?: any,
    orderType?: string,
    deliveryPlatform?: string,
    deliveryOrderNumber?: string
  ) => Promise<boolean>;
  isShiftActive: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MobileCartDrawer(props: MobileCartDrawerProps) {
  const { open, onOpenChange } = props;

  // Use the cart context to get all cart data
  const { items, calculations } = useCart();

  // Use the final total from calculations which already includes all discounts
  const actualTotal = calculations.finalTotal;
  
  return (
    <>
      {/* Floating Cart Button */}
      <div className="fixed bottom-4 right-4 z-50 tablet:hidden">
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetTrigger asChild>
            <Button 
              size="lg" 
              className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="relative">
                <ShoppingCart className="h-6 w-6" />
                {items.length > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {items.length}
                  </Badge>
                )}
              </div>
            </Button>
          </SheetTrigger>
          <SheetContent 
            side="bottom" 
            className="h-[85vh] rounded-t-xl overflow-hidden flex flex-col"
          >
            <SheetHeader className="pb-4 flex-shrink-0">
              <SheetTitle className="flex items-center justify-between">
                <span>Cart ({items.length} items)</span>
                <span className="text-lg font-bold">₱{actualTotal.toFixed(2)}</span>
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="flex-1">
              <div className="px-1">
                <CartView {...props} />
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom Summary Bar */}
      {items.length > 0 && !open && (
        <div 
          className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 tablet:hidden z-40 cursor-pointer hover:bg-accent/5 transition-colors active:bg-accent/10"
          onClick={() => onOpenChange(true)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{items.length} items</p>
              <p className="font-semibold">₱{actualTotal.toFixed(2)}</p>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              Tap to view cart
              <span className="text-primary">↑</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Spacer for bottom bar */}
      {items.length > 0 && !open && (
        <div className="h-20 tablet:hidden" />
      )}
    </>
  );
}
