
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, Trash2 } from "lucide-react";
import { CartItem, Customer } from "@/types";
import CustomerLookup from "./CustomerLookup";
import DiscountSelector from "./DiscountSelector";
import PaymentProcessor from "./PaymentProcessor";

interface CartViewProps {
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  discountIdNumber?: string;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handlePaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => void;
  isShiftActive: boolean;
}

export default function CartView({
  items,
  subtotal,
  tax,
  total,
  discount,
  discountType,
  discountIdNumber,
  removeItem,
  updateQuantity,
  clearCart,
  selectedCustomer,
  setSelectedCustomer,
  handleApplyDiscount,
  handlePaymentComplete,
  isShiftActive
}: CartViewProps) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg text-croffle-primary">Current Order</h2>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={clearCart}
          className="text-croffle-accent hover:text-croffle-accent/90 hover:bg-croffle-background"
          disabled={items.length === 0 || !isShiftActive}
        >
          Clear All
        </Button>
      </div>
      
      {/* Customer Selection */}
      <div className="mb-4">
        <CustomerLookup 
          onSelectCustomer={setSelectedCustomer}
          selectedCustomer={selectedCustomer}
        />
      </div>
      
      {/* Cart Items */}
      <div className="space-y-4 mb-4 max-h-[calc(100vh-22rem)] overflow-y-auto">
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Your cart is empty</p>
            <p className="text-sm">Select products to add them to your order</p>
          </div>
        ) : (
          items.map((item, index) => (
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
                  ₱{(item.price * item.quantity).toFixed(2)}
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
          ))
        )}
      </div>
      
      {/* Discount Selection */}
      <DiscountSelector
        subtotal={subtotal}
        onApplyDiscount={handleApplyDiscount}
        currentDiscount={discount}
        currentDiscountType={discountType}
        currentDiscountIdNumber={discountIdNumber}
      />
      
      {/* Order Summary */}
      <div className="space-y-2 pt-4">
        <Separator className="bg-croffle-primary/20" />
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium">₱{subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>-₱{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">VAT (12%)</span>
          <span className="font-medium">₱{tax.toFixed(2)}</span>
        </div>
        <Separator className="bg-croffle-primary/20" />
        <div className="flex justify-between text-lg font-bold">
          <span className="text-croffle-primary">Total</span>
          <span className="text-croffle-primary">₱{(total - discount).toFixed(2)}</span>
        </div>
        
        {/* Payment Processor */}
        <PaymentProcessor
          total={total - discount}
          onPaymentComplete={handlePaymentComplete}
        />
      </div>
    </div>
  );
}
