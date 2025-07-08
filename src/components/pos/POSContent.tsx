
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ShiftManager from "@/components/pos/ShiftManager";
import CartView from "@/components/pos/CartView";
import ProductGrid from "@/components/pos/product-grid";
import { InventoryStatusIndicator } from "@/components/pos/InventoryStatusIndicator";
import { useCart } from "@/contexts/cart/CartContext";
import { Product, Category, Customer, ProductVariation } from "@/types";
import { StoreNameDisplay } from "@/components/shared/StoreNameDisplay";
import { useStoreDisplay } from "@/contexts/StoreDisplayContext";
import { PrinterStatusIndicator } from "@/components/printer/PrinterStatusIndicator";
import { ThermalPrinterSettings } from "@/components/printer/ThermalPrinterSettings";
import { Settings } from "lucide-react";
import { SeniorDiscount } from "@/hooks/useTransactionHandler";
import MobileCartDrawer from "./MobileCartDrawer";
import CompactShiftManager from "./CompactShiftManager";
import { useState } from "react";

interface POSContentProps {
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  currentStore: any;
  currentShift: any;
  selectedCustomer: Customer | null;
  setSelectedCustomer: (customer: Customer | null) => void;
  discount: number;
  discountType?: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo';
  discountIdNumber?: string;
  seniorDiscounts: SeniorDiscount[];
  otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string } | null;
  handleApplyDiscount: (discountAmount: number, discountType: 'senior' | 'pwd' | 'employee' | 'loyalty' | 'promo', idNumber?: string) => void;
  handleApplyMultipleDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: { type: 'pwd' | 'employee' | 'loyalty' | 'promo', amount: number, idNumber?: string }) => void;
  handlePaymentComplete: (paymentMethod: 'cash' | 'card' | 'e-wallet', amountTendered: number, paymentDetails?: {
    cardType?: string;
    cardNumber?: string;
    eWalletProvider?: string;
    eWalletReferenceNumber?: string;
  }) => void;
  addItemToCart: (product: Product, quantity?: number, variation?: ProductVariation) => void;
  storeId?: string;
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
  const {
    config
  } = useStoreDisplay();
  
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-0 h-full">
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-4 px-4 sm:px-0">
        <div className="flex items-center gap-2">
          {currentStore && config.contentMode !== "hidden" && (
            <StoreNameDisplay variant="badge" size="sm" showLogo={true} />
          )}
          {selectedCustomer && (
            <Badge variant="secondary" className="text-sm">
              Customer: {selectedCustomer.name}
            </Badge>
          )}
        </div>

        {/* Status Indicators and Settings */}
        <div className="flex items-center gap-2">
          <InventoryStatusIndicator />
          <PrinterStatusIndicator />
          <ThermalPrinterSettings>
            <Button variant="outline" size="sm" className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Printer</span>
            </Button>
          </ThermalPrinterSettings>
        </div>
      </div>

      {/* Collapsible Shift Manager */}
      <div className="mb-4">
        <CompactShiftManager />
      </div>
      
      {/* Mobile Layout: Full-screen products with sliding cart */}
      <div className="flex-1 overflow-hidden tablet:hidden pb-20">
        <Card className="h-full border-primary/20">
          <CardContent className="p-2 sm:p-4 h-full flex flex-col overflow-hidden">
            <ProductGrid
              products={products} 
              categories={categories} 
              activeCategory={activeCategory} 
              setActiveCategory={setActiveCategory} 
              addItemToCart={addItemToCart} 
              isShiftActive={!!currentShift} 
              isLoading={isLoading}
              storeId={storeId}
            />
          </CardContent>
        </Card>
        
        {/* Mobile Cart Drawer */}
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

      {/* Tablet Layout: 60/40 Split */}
      <div className="flex-1 flex-row gap-4 overflow-hidden hidden tablet:flex desktop:hidden">
        {/* Product Selection Area - 60% */}
        <div className="flex-[3] min-h-0">
          <Card className="h-full border-primary/20">
            <CardContent className="p-4 h-full flex flex-col overflow-hidden">
              <ProductGrid
                products={products} 
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory} 
                addItemToCart={addItemToCart} 
                isShiftActive={!!currentShift} 
                isLoading={isLoading}
                storeId={storeId}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Cart Area - 40% */}
        <div className="flex-[2] flex-shrink-0">
          <Card className="border-primary/20 h-full">
            <CardContent className="p-4 h-full">
              <CartView 
                selectedCustomer={selectedCustomer} 
                setSelectedCustomer={setSelectedCustomer} 
                handleApplyDiscount={handleApplyDiscount} 
                handleApplyMultipleDiscounts={handleApplyMultipleDiscounts}
                handlePaymentComplete={handlePaymentComplete} 
                isShiftActive={!!currentShift} 
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Desktop Layout: Traditional side by side */}
      <div className="flex-1 flex-row gap-4 overflow-hidden hidden desktop:flex">
        {/* Product Selection Area - Desktop */}
        <div className="flex-1 min-h-0">
          <Card className="h-full border-primary/20">
            <CardContent className="p-4 h-full flex flex-col overflow-hidden">
              <ProductGrid
                products={products} 
                categories={categories} 
                activeCategory={activeCategory} 
                setActiveCategory={setActiveCategory} 
                addItemToCart={addItemToCart} 
                isShiftActive={!!currentShift} 
                isLoading={isLoading}
                storeId={storeId}
              />
            </CardContent>
          </Card>
        </div>
        
        {/* Cart Area - Desktop */}
        <div className="w-96 flex-shrink-0">
          <Card className="border-primary/20 h-full">
            <CardContent className="p-4 h-full">
              <CartView 
                selectedCustomer={selectedCustomer} 
                setSelectedCustomer={setSelectedCustomer} 
                handleApplyDiscount={handleApplyDiscount} 
                handleApplyMultipleDiscounts={handleApplyMultipleDiscounts}
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
