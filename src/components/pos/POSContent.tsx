
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ShiftManager from "@/components/pos/ShiftManager";
import CartView from "@/components/pos/CartView";
import ProductGrid from "@/components/pos/ProductGrid";
import { useCart } from "@/contexts/CartContext";
import { Customer } from "@/types";

interface POSContentProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  products: any[];
  categories: any[];
  isLoading: boolean;
  currentStore: any;
  currentShift: any;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  discountIdNumber?: string;
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
}

export default function POSContent({
  activeCategory,
  setActiveCategory,
  products,
  categories,
  isLoading,
  currentStore,
  currentShift,
  selectedCustomer,
  setSelectedCustomer,
  discount,
  discountType,
  discountIdNumber,
  handleApplyDiscount,
  handlePaymentComplete
}: POSContentProps) {
  const { 
    items, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    addItem,
    subtotal,
    tax,
    total,
  } = useCart();

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-croffle-primary">Point of Sale</h1>
        {currentStore && (
          <Badge variant="outline" className="text-sm">
            Store: {currentStore.name}
          </Badge>
        )}
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4 h-full">
        {/* Product Selection Area */}
        <div className="flex-1">
          {/* Shift Manager */}
          <ShiftManager />
          
          <Card className="h-full border-croffle-primary/20">
            <CardContent className="p-4">
              <ProductGrid
                products={products}
                categories={categories}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                addItemToCart={addItem}
                isShiftActive={!!currentShift}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Cart Area */}
        <div className="w-full lg:w-96">
          <Card className="border-croffle-primary/20">
            <CardContent className="p-4">
              <CartView 
                items={items}
                subtotal={subtotal}
                tax={tax}
                total={total}
                discount={discount}
                discountType={discountType}
                discountIdNumber={discountIdNumber}
                removeItem={removeItem}
                updateQuantity={updateQuantity}
                clearCart={clearCart}
                selectedCustomer={selectedCustomer}
                setSelectedCustomer={setSelectedCustomer}
                handleApplyDiscount={handleApplyDiscount}
                handlePaymentComplete={handlePaymentComplete}
                isShiftActive={!!currentShift}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
