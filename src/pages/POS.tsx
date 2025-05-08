
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useStore } from "@/contexts/StoreContext";
import { useShift } from "@/contexts/ShiftContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Customer, Transaction } from "@/types";
import { createTransaction } from "@/services/transactionService";

// Import POS components
import ShiftManager from "@/components/pos/ShiftManager";
import CartView from "@/components/pos/CartView";
import ProductGrid from "@/components/pos/ProductGrid";
import CompletedTransaction from "@/components/pos/CompletedTransaction";
import { useProductData } from "@/hooks/useProductData";

export default function POS() {
  const { currentStore } = useStore();
  const { currentShift } = useShift();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | undefined>(undefined);
  const [discountIdNumber, setDiscountIdNumber] = useState<string | undefined>(undefined);
  
  const { 
    items, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart, 
    subtotal,
    tax,
    total,
    storeId
  } = useCart();

  // Load product data
  const { products, categories, isLoading } = useProductData(currentStore?.id || null);
  
  const handleApplyDiscount = (
    discountAmount: number, 
    type: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo',
    idNumber?: string
  ) => {
    setDiscount(discountAmount);
    setDiscountType(type);
    setDiscountIdNumber(idNumber);
  };
  
  const handlePaymentComplete = async (
    paymentMethod: 'cash' | 'card' | 'e-wallet',
    amountTendered: number,
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    }
  ) => {
    if (!currentStore || !currentShift) {
      return;
    }
    
    // Create transaction objects
    const transactionItems = items.map(item => ({
      productId: item.productId,
      variationId: item.variationId,
      name: item.variation ? `${item.product.name} (${item.variation.name})` : item.product.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity
    }));
    
    const transaction: Omit<Transaction, "id" | "createdAt" | "receiptNumber"> = {
      shiftId: currentShift.id,
      storeId: currentStore.id,
      userId: currentShift.userId,
      customerId: selectedCustomer?.id,
      customer: selectedCustomer || undefined,
      items: transactionItems,
      subtotal,
      tax,
      discount,
      discountType,
      discountIdNumber,
      total: total - discount,
      amountTendered,
      change: paymentMethod === 'cash' ? amountTendered - (total - discount) : undefined,
      paymentMethod,
      paymentDetails,
      status: 'completed'
    };
    
    // Call the service to create the transaction
    const result = await createTransaction(transaction);
    
    if (result) {
      setCompletedTransaction(result);
      clearCart(); // Clear the cart after successful transaction
    }
  };
  
  const startNewSale = () => {
    setCompletedTransaction(null);
    setSelectedCustomer(null);
    setDiscount(0);
    setDiscountType(undefined);
    setDiscountIdNumber(undefined);
    clearCart();
  };

  // If we have a completed transaction, show the receipt
  if (completedTransaction) {
    return (
      <CompletedTransaction
        transaction={completedTransaction}
        customer={selectedCustomer}
        startNewSale={startNewSale}
      />
    );
  }

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
