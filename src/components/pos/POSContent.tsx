
import React, { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CartView from "@/components/pos/CartView";
import ProductGrid from "@/components/pos/product-grid";

import { useCart } from "@/contexts/cart/CartContext";
import { Product, Category, Customer, ProductVariation } from "@/types";
import { SeniorDiscount } from "@/hooks/useTransactionHandler";
import MobileCartDrawer from "./MobileCartDrawer";
import { useState } from "react";

interface POSContentProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  products: Product[];
  allProducts: Product[]; // Unfiltered products for combo dialog
  categories: Category[];
  isLoading: boolean;
  currentStore: any;
  currentShift: any;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary';
  discountIdNumber?: string;
  seniorDiscounts: SeniorDiscount[];
  otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary', amount: number, idNumber?: string, justification?: string } | null;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary', idNumber?: string, justification?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo' | 'complimentary', amount: number, idNumber?: string, justification?: string }) => void;
  handlePaymentComplete: (
    paymentMethod: 'cash' | 'card' | 'e-wallet', 
    amountTendered: number, 
    paymentDetails?: {
      cardType?: string;
      cardNumber?: string;
      eWalletProvider?: string;
      eWalletReferenceNumber?: string;
    },
    orderType?: string,
    deliveryPlatform?: string,
    deliveryOrderNumber?: string
  ) => Promise<boolean>;
  addItemToCart: (product: Product, quantity?: number, variation?: ProductVariation, customization?: any) => void;
  storeId?: string;
}

const POSContent = memo(function POSContent({
  activeCategory,
  setActiveCategory,
  products,
  allProducts,
  categories,
  isLoading,
  currentStore,
  currentShift,
  selectedCustomer,
  setSelectedCustomer,
  discount,
  discountType,
  discountIdNumber,
  seniorDiscounts,
  otherDiscount,
  handleApplyDiscount,
  handleApplyMultipleDiscounts,
  handlePaymentComplete,
  addItemToCart,
  storeId
}: POSContentProps) {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    calculations
  } = useCart();
  
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  return (
    <div className="flex h-full bg-muted/30 gap-3">
      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Products Section */}
        <div className="flex-1 bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="p-3 md:p-4 h-full flex flex-col">
            {storeId && products.length > 0 && (
              <ProductGrid
                products={products} 
                allProducts={allProducts}
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory}
                addItemToCart={(p,q,v,c)=>addItemToCart(p,q,v,c)}
                isShiftActive={!!currentShift}
                isLoading={isLoading}
                storeId={storeId}
              />
            )}
          </div>
        </div>
      </div>

      {/* Cart Sidebar - Tablet and Desktop */}
      <div className="hidden md:flex w-80 lg:w-96 flex-shrink-0">
        <div className="w-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
          <div className="p-3 md:p-4 h-full">
            <CartView 
              selectedCustomer={selectedCustomer} 
              setSelectedCustomer={setSelectedCustomer} 
              handleApplyDiscount={handleApplyDiscount} 
              handleApplyMultipleDiscounts={handleApplyMultipleDiscounts}
              handlePaymentComplete={handlePaymentComplete} 
              isShiftActive={!!currentShift} 
            />
          </div>
        </div>
      </div>

      {/* Mobile Cart Drawer */}
      <div className="md:hidden">
        <MobileCartDrawer
          selectedCustomer={selectedCustomer}
          setSelectedCustomer={setSelectedCustomer}
          handleApplyDiscount={handleApplyDiscount}
          handleApplyMultipleDiscounts={handleApplyMultipleDiscounts}
          handlePaymentComplete={handlePaymentComplete}
          isShiftActive={!!currentShift}
          open={isMobileCartOpen}
          onOpenChange={setIsMobileCartOpen}
        />
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if critical props change
  return (
    prevProps.products === nextProps.products &&
    prevProps.activeCategory === nextProps.activeCategory &&
    prevProps.currentShift?.id === nextProps.currentShift?.id &&
    prevProps.discount === nextProps.discount
  );
});

export default POSContent;
