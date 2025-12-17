
import { useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { toast } from "sonner";
import { useStore } from "../StoreContext";
import { CartContext, OrderType, DeliveryPlatform } from "./CartContext";
import { CartCalculationService, SeniorDiscount, OtherDiscount, CartCalculations, DiscountBeneficiary } from "@/services/cart/CartCalculationService";
import { BOGOService } from "@/services/cart/BOGOService";
import { CartValidationService } from "@/services/cart/CartValidationService";
import { enhancedPricingService } from "@/services/pos/enhancedPricingService";

export function CartProvider({ children }: { children: ReactNode }) {
  const { currentStore } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  
  // Legacy discount state (backward compatibility)
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>([]);
  const [otherDiscount, setOtherDiscount] = useState<OtherDiscount | null>(null);
  const [totalDiners, setTotalDiners] = useState(1);
  
  // NEW: Multi-beneficiary discount state
  const [discountBeneficiaries, setDiscountBeneficiaries] = useState<DiscountBeneficiary[]>([]);
  const [regularDiners, setRegularDiners] = useState(1);
  const [customPercentage, setCustomPercentage] = useState<number | undefined>(undefined);
  
  const [storeId, setStoreId] = useState<string | null>(null);
  
  // Order type state
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [deliveryPlatform, setDeliveryPlatform] = useState<DeliveryPlatform | null>(null);
  const [deliveryOrderNumber, setDeliveryOrderNumber] = useState('');

  // Debug order type changes and handle pricing conflicts
  const handleSetOrderType = (newOrderType: OrderType) => {
    console.log("CartContext: Order type changing", { 
      from: orderType, 
      to: newOrderType, 
      itemsCount: items.length,
      itemsData: items.map(i => ({ name: i.product.name, qty: i.quantity }))
    });
    
    // Clear pricing overrides when switching order types to prevent conflicts
    if (orderType !== newOrderType && items.length > 0) {
      console.log("🧹 CartContext: Clearing pricing overrides due to order type change");
      const resetItems = enhancedPricingService.clearPricingOverrides(
        items, 
        `Order type changed from ${orderType} to ${newOrderType}`
      );
      setItems(resetItems);
      enhancedPricingService.resetPricingHistory();
    }
    
    setOrderType(newOrderType);
  };

  useEffect(() => {
    if (currentStore?.id) {
      setStoreId(currentStore.id);
      console.log("CartContext: Current store set:", currentStore.id);
    }
  }, [currentStore]);

  // Enable pricing debug mode in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      enhancedPricingService.enableDebug(true);
    }
  }, []);

  // Memoize calculations - use new beneficiary system if beneficiaries exist
  const calculations = useMemo(() => {
    if (items.length === 0) {
      return CartCalculationService.getEmptyCalculations();
    }
    
    // Validate items
    const validItems = items.filter(i => i.price !== undefined && i.price !== null && i.quantity > 0);
    if (validItems.length !== items.length) {
      console.error("❌ CartProvider: Some items missing price or quantity!");
    }

    // Use new beneficiary calculation if beneficiaries are set
    if (discountBeneficiaries.length > 0) {
      const effectiveTotalDiners = discountBeneficiaries.length + regularDiners;
      return CartCalculationService.calculateWithBeneficiaries(
        validItems,
        discountBeneficiaries,
        effectiveTotalDiners,
        customPercentage
      );
    }
    
    // Fall back to legacy calculation
    const calculationResult = CartCalculationService.calculateCartTotals(
      validItems,
      seniorDiscounts,
      otherDiscount,
      totalDiners
    );
    
    console.log("🧮 CartProvider: Cart calculation RESULT", {
      itemsCount: validItems.length,
      seniorDiscountsCount: seniorDiscounts.length,
      totalDiners,
      grossSubtotal: calculationResult.grossSubtotal,
      finalTotal: calculationResult.finalTotal
    });
    
    return calculationResult;
  }, [items, seniorDiscounts, otherDiscount, totalDiners, discountBeneficiaries, regularDiners, customPercentage]);

  const itemCount = useMemo(() => 
    items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  
  const getCartCalculations = useCallback((): CartCalculations => {
    return calculations;
  }, [calculations]);

  const addItem = (product: Product, quantity = 1, variation?: ProductVariation, customization?: any) => {
    console.log("🛒 CartContext: addItem function called!", {
      product: product ? product.name : "NULL",
      productId: product ? product.id : "NULL",
      quantity
    });

    if (!currentStore?.id) {
      console.error("CartContext: No store selected");
      toast.error("Please select a store first");
      return;
    }

    if (!product) {
      console.error("CartContext: No product provided");
      toast.error("Invalid product");
      return;
    }

    const itemPrice = customization ? customization.final_price ?? (variation ? variation.price : product.price) : (variation ? variation.price : product.price);

    const normalizeMixMatch = (c: any) => {
      if (!c || c.type !== 'mix_match_croffle') return null;
      const toppingIds = (c.combo?.toppings || [])
        .map((x: any) => x?.addon?.id)
        .filter(Boolean)
        .sort();
      const sauceIds = (c.combo?.sauces || [])
        .map((x: any) => x?.addon?.id)
        .filter(Boolean)
        .sort();
      return {
        type: c.type,
        croffleType: c.croffleType,
        toppingIds: JSON.stringify(toppingIds),
        sauceIds: JSON.stringify(sauceIds)
      };
    };

    const existingItemIndex = items.findIndex((item) => {
      if (customization) {
        if (customization.type === 'mix_match_croffle') {
          const a = normalizeMixMatch(item.customization);
          const b = normalizeMixMatch(customization);
          return item.productId === product.id && 
                 a && b && 
                 a.croffleType === b.croffleType && 
                 a.toppingIds === b.toppingIds && 
                 a.sauceIds === b.sauceIds && 
                 (item.variationId ?? null) === (variation?.id ?? null);
        }
        if (item.customization?.selected_choices || customization.selected_choices) {
          return item.productId === product.id &&
                 item.customization &&
                 JSON.stringify(item.customization.selected_choices || []) === JSON.stringify(customization.selected_choices || []) &&
                 (item.variationId ?? null) === (variation?.id ?? null);
        }
        return false;
      }
      
      if (variation?.id) {
        return item.productId === product.id && 
               (item.variationId ?? null) === variation.id && 
               !item.customization;
      }
      
      return item.productId === product.id && 
             (item.variationId ?? null) === null && 
             !item.customization;
    });

    if (existingItemIndex !== -1) {
      const newItems = [...items];
      newItems[existingItemIndex] = {
        ...newItems[existingItemIndex],
        quantity: newItems[existingItemIndex].quantity + quantity
      };
      setItems(newItems);

      const displayName = customization ? customization.display_name :
        (variation ? `${product.name} (${variation.name})` : product.name);

      toast.success(`Updated quantity for ${displayName}`);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        product: {
          ...product,
          is_active: product.is_active || product.isActive || true,
          stock_quantity: product.stock_quantity || product.stockQuantity || 0,
        },
        quantity,
        price: itemPrice,
        variationId: variation?.id ?? null,
        variation: variation ?? undefined,
        customization: customization ?? undefined,
      };

      setItems(prevItems => [...prevItems, newItem]);

      const displayName = variation ?
        `${product.name} (${variation.name})` :
        product.name;

      toast.success(`${displayName} added to cart`);
    }
  };

  const removeItem = (itemIndex: number) => {
    const newItems = [...items];
    const removedItem = newItems[itemIndex];
    newItems.splice(itemIndex, 1);
    setItems(newItems);
    toast.info(`${removedItem.product.name} removed from cart`);
  };

  const updateQuantity = (itemIndex: number, quantity: number) => {
    if (quantity < 1) return;
    if (itemIndex < 0 || itemIndex >= items.length) return;

    const newItems = [...items];
    newItems[itemIndex] = { ...newItems[itemIndex], quantity };
    setItems(newItems);
  };

  const updateItemPrice = (itemIndex: number, price: number) => {
    if (price < 0) return;

    const newItems = [...items];
    newItems[itemIndex] = { ...newItems[itemIndex], price };
    setItems(newItems);
    toast.success(`Price updated for ${newItems[itemIndex].product.name}`);
  };

  const clearCart = () => {
    setItems([]);
    setSeniorDiscounts([]);
    setOtherDiscount(null);
    setTotalDiners(1);
    setDiscountBeneficiaries([]);
    setRegularDiners(1);
    setCustomPercentage(undefined);
    toast.info('Cart cleared');
  };

  // Legacy discount application (backward compatibility)
  const applyDiscounts = (newSeniorDiscounts: SeniorDiscount[], newOtherDiscount?: OtherDiscount | null, newTotalDiners: number = 1) => {
    // Clear new beneficiary system when using legacy
    setDiscountBeneficiaries([]);
    setRegularDiners(0);
    setCustomPercentage(newOtherDiscount?.customPercentage);
    
    setSeniorDiscounts(newSeniorDiscounts);
    setOtherDiscount(newOtherDiscount || null);
    setTotalDiners(newTotalDiners);
  };

  // NEW: Multi-beneficiary discount application
  const applyBeneficiaryDiscounts = (
    beneficiaries: DiscountBeneficiary[],
    newTotalDiners: number,
    newCustomPercentage?: number
  ) => {
    // Clear legacy system when using new
    setSeniorDiscounts([]);
    setOtherDiscount(null);
    setTotalDiners(1);
    
    // Calculate regular diners
    const effectiveRegularDiners = Math.max(0, newTotalDiners - beneficiaries.length);
    
    setDiscountBeneficiaries(beneficiaries);
    setRegularDiners(effectiveRegularDiners);
    setCustomPercentage(newCustomPercentage);
    
    console.log("🎫 CartProvider: Applied beneficiary discounts", {
      beneficiariesCount: beneficiaries.length,
      totalDiners: newTotalDiners,
      regularDiners: effectiveRegularDiners,
      beneficiaryTypes: beneficiaries.map(b => b.type)
    });
  };

  // Cart validation functions
  const validateCart = async () => {
    if (!currentStore?.id) return;
    const validation = await CartValidationService.validateCartItems(items);
    if (!validation.success) {
      setItems(validation.validItems);
    }
  };

  const cleanInvalidItems = async () => {
    if (!currentStore?.id) return;
    const cleanItems = await CartValidationService.cleanCart(items);
    setItems(cleanItems);
  };

  const refreshCartData = async () => {
    if (!currentStore?.id) return;
    const refreshedItems = await CartValidationService.refreshCartData(items, currentStore.id);
    setItems(refreshedItems);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateItemPrice,
        clearCart,
        validateCart,
        cleanInvalidItems,
        refreshCartData,
        subtotal: calculations.grossSubtotal,
        tax: calculations.adjustedVAT,
        total: calculations.finalTotal,
        itemCount,
        storeId,
        orderType,
        setOrderType: handleSetOrderType,
        deliveryPlatform,
        setDeliveryPlatform,
        deliveryOrderNumber,
        setDeliveryOrderNumber,
        // Legacy discount management
        seniorDiscounts,
        otherDiscount,
        totalDiners,
        applyDiscounts,
        // New beneficiary discount management
        discountBeneficiaries,
        regularDiners,
        applyBeneficiaryDiscounts,
        customPercentage,
        calculations,
        getCartCalculations,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
