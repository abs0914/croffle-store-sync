
import { useState, useEffect, ReactNode } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { toast } from "sonner";
import { useStore } from "../StoreContext";
import { CartContext, OrderType, DeliveryPlatform } from "./CartContext";
import { CartCalculationService, SeniorDiscount, OtherDiscount, CartCalculations } from "@/services/cart/CartCalculationService";
import { BOGOService } from "@/services/cart/BOGOService";
import { CartValidationService } from "@/services/cart/CartValidationService";
import { enhancedPricingService } from "@/services/pos/enhancedPricingService";

export function CartProvider({ children }: { children: ReactNode }) {
  const { currentStore } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>([]);
  const [otherDiscount, setOtherDiscount] = useState<OtherDiscount | null>(null);
  const [totalDiners, setTotalDiners] = useState(1);
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

  // Get calculations using the centralized service
  const getCartCalculations = (): CartCalculations => {
    // Check if we should auto-apply BOGO (don't if there's already a manual BOGO discount)
    const shouldAutoApplyBOGO = !otherDiscount || otherDiscount.type !== 'bogo';
    
    const calculationResult = CartCalculationService.calculateCartTotals(
      items,
      seniorDiscounts,
      otherDiscount,
      totalDiners,
      shouldAutoApplyBOGO
    );
    
    console.log("🧮 CartProvider: Cart calculation debug", {
      itemsCount: items.length,
      itemsData: items.map(i => ({ name: i.product.name, qty: i.quantity, price: i.price })),
      seniorDiscountsCount: seniorDiscounts.length,
      otherDiscount: otherDiscount,
      totalDiners,
      shouldAutoApplyBOGO,
      calculationResult
    });
    return calculationResult;
  };

  const calculations = getCartCalculations();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (product: Product, quantity = 1, variation?: ProductVariation, customization?: any) => {
    console.log("🛒 CartContext: addItem function called! Arguments:", {
      product: product ? product.name : "NULL",
      productId: product ? product.id : "NULL",
      quantity,
      variation: variation ? variation.name : "none",
      customization: customization ? "present" : "none",
      currentStoreId: currentStore?.id,
      functionType: typeof addItem,
      currentItemsCount: items.length
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
    console.log("CartContext: Item price determined:", itemPrice);

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

    const existingItemIndex = items.findIndex(item => {
      if (customization) {
        // Handle Mix & Match croffle uniqueness by selection signature
        if (customization.type === 'mix_match_croffle') {
          const a = normalizeMixMatch(item.customization);
          const b = normalizeMixMatch(customization);
          return item.productId === product.id && a && b && a.croffleType === b.croffleType && a.toppingIds === b.toppingIds && a.sauceIds === b.sauceIds && (item.variationId || null) === (variation?.id || null);
        }
        // Legacy recipe customization: compare selected_choices if present; otherwise treat as unique
        if (item.customization?.selected_choices || customization.selected_choices) {
          return item.productId === product.id &&
                 item.customization &&
                 JSON.stringify(item.customization.selected_choices || []) === JSON.stringify(customization.selected_choices || []) &&
                 (item.variationId || null) === (variation?.id || null);
        }
        return false;
      }
      if (variation) {
        return item.productId === product.id && item.variationId === variation.id && !item.customization;
      }
      return item.productId === product.id && !item.variationId && !item.customization;
    });

    console.log("CartContext: Existing item index:", existingItemIndex);
    console.log("CartContext: Current items before addition:", items);

    if (existingItemIndex !== -1) {
      console.log("🛒 CartContext: Updated existing item quantity");
      const newItems = [...items];
      newItems[existingItemIndex].quantity += quantity;
      console.log("🛒 CartContext: About to setItems for existing item", { beforeCount: items.length, afterCount: newItems.length });
      setItems(newItems);

      const displayName = customization ? customization.display_name :
        (variation ? `${product.name} (${variation.name})` : product.name);

      toast.success(`Updated quantity for ${displayName}`);
      console.log("CartContext: Updated existing item in cart", displayName);
    } else {
      console.log("CartContext: Creating new item for cart");
      const newItem: CartItem = {
        productId: product.id,
        product: {
          ...product,
          is_active: product.is_active || product.isActive || true,
          stock_quantity: product.stock_quantity || product.stockQuantity || 0,
        },
        quantity,
        price: itemPrice,
        customization: customization || undefined,
      };

      if (variation) {
        newItem.variationId = variation.id;
        newItem.variation = variation;
      }

      console.log("🛒 CartContext: New cart item created:", newItem);

      console.log("🛒 CartContext: About to setItems for new item", { currentCount: items.length });
      setItems(prevItems => {
        console.log("🛒 CartContext: setItems callback - Previous items:", prevItems.length);
        const updatedItems = [...prevItems, newItem];
        console.log("🛒 CartContext: setItems callback - Updated items array:", updatedItems.length);
        return updatedItems;
      });

      const displayName = variation ?
        `${product.name} (${variation.name})` :
        product.name;

      toast.success(`${displayName} added to cart`);
      console.log("CartContext: Added new item to cart", displayName);
    }

    console.log("CartContext: addItem function completed");
  };

  const removeItem = (itemIndex: number) => {
    const newItems = [...items];
    const removedItem = newItems[itemIndex];
    newItems.splice(itemIndex, 1);
    setItems(newItems);
    toast.info(`${removedItem.product.name} removed from cart`);
    console.log("CartContext: Removed item from cart", removedItem.product.name);
  };

  const updateQuantity = (itemIndex: number, quantity: number) => {
    if (quantity < 1) return;

    const newItems = [...items];
    newItems[itemIndex].quantity = quantity;
    setItems(newItems);
    console.log("CartContext: Updated quantity for item", {
      product: newItems[itemIndex].product.name,
      newQuantity: quantity
    });
  };

  const updateItemPrice = (itemIndex: number, price: number) => {
    if (price < 0) return;

    const newItems = [...items];
    newItems[itemIndex].price = price;
    setItems(newItems);
    console.log("CartContext: Updated price for item", {
      product: newItems[itemIndex].product.name,
      newPrice: price
    });
    toast.success(`Price updated for ${newItems[itemIndex].product.name}`);
  };

  const clearCart = () => {
    setItems([]);
    setSeniorDiscounts([]);
    setOtherDiscount(null);
    setTotalDiners(1);
    // DON'T reset order type when clearing cart - preserve user's selection
    // setOrderType('dine_in');
    // setDeliveryPlatform(null);
    // setDeliveryOrderNumber('');
    toast.info('Cart cleared');
    console.log("CartContext: Cart cleared - preserving order type:", orderType);
  };

  const applyDiscounts = (newSeniorDiscounts: SeniorDiscount[], newOtherDiscount?: OtherDiscount | null, newTotalDiners: number = 1) => {
    setSeniorDiscounts(newSeniorDiscounts);
    setOtherDiscount(newOtherDiscount || null);
    setTotalDiners(newTotalDiners);
  };

  // Cart validation functions
  const validateCart = async () => {
    console.log('🔍 [CartProvider] Starting cart validation...');
    if (!currentStore?.id) return;
    
    const validation = await CartValidationService.validateCartItems(items);
    if (!validation.success) {
      setItems(validation.validItems);
    }
  };

  const cleanInvalidItems = async () => {
    console.log('🧹 [CartProvider] Cleaning invalid items...');
    if (!currentStore?.id) return;
    
    const cleanItems = await CartValidationService.cleanCart(items);
    setItems(cleanItems);
  };

  const refreshCartData = async () => {
    console.log('🔄 [CartProvider] Refreshing cart data...');
    if (!currentStore?.id) return;
    
    const refreshedItems = await CartValidationService.refreshCartData(items, currentStore.id);
    setItems(refreshedItems);
  };

  console.log("CartProvider: Provider rendering with items:", items.length);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateItemPrice,
        clearCart,
        // Cart validation functions
        validateCart,
        cleanInvalidItems,
        refreshCartData,
        subtotal: calculations.grossSubtotal,
        tax: calculations.adjustedVAT,
        total: calculations.finalTotal,
        itemCount,
        storeId,
        // Order type management
        orderType,
        setOrderType: handleSetOrderType,
        deliveryPlatform,
        setDeliveryPlatform,
        deliveryOrderNumber,
        setDeliveryOrderNumber,
        // Discount management
        seniorDiscounts,
        otherDiscount,
        totalDiners,
        applyDiscounts,
        calculations,
        getCartCalculations,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
