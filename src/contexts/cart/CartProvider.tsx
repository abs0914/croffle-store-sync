
import { useState, useEffect, ReactNode } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { toast } from "sonner";
import { useStore } from "../StoreContext";
import { CartContext } from "./CartContext";
import { CartCalculationService, SeniorDiscount, OtherDiscount, CartCalculations } from "@/services/cart/CartCalculationService";

export function CartProvider({ children }: { children: ReactNode }) {
  const { currentStore } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [seniorDiscounts, setSeniorDiscounts] = useState<SeniorDiscount[]>([]);
  const [otherDiscount, setOtherDiscount] = useState<OtherDiscount | null>(null);
  const [totalDiners, setTotalDiners] = useState(1);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (currentStore?.id) {
      setStoreId(currentStore.id);
      console.log("CartContext: Current store set:", currentStore.id);
    }
  }, [currentStore]);

  // Get calculations using the centralized service
  const getCartCalculations = (): CartCalculations => {
    return CartCalculationService.calculateCartTotals(
      items,
      seniorDiscounts,
      otherDiscount,
      totalDiners
    );
  };

  const calculations = getCartCalculations();
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addItem = (product: Product, quantity = 1, variation?: ProductVariation) => {
    console.log("CartContext: addItem function called! Arguments:", {
      product: product ? product.name : "NULL",
      productId: product ? product.id : "NULL",
      quantity,
      variation: variation ? variation.name : "none",
      currentStoreId: currentStore?.id,
      functionType: typeof addItem
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

    const itemPrice = variation ? variation.price : product.price;
    console.log("CartContext: Item price determined:", itemPrice);

    const existingItemIndex = items.findIndex(item => {
      if (variation) {
        return item.productId === product.id && item.variationId === variation.id;
      }
      return item.productId === product.id && !item.variationId;
    });

    console.log("CartContext: Existing item index:", existingItemIndex);
    console.log("CartContext: Current items before addition:", items);

    if (existingItemIndex !== -1) {
      console.log("CartContext: Updating existing item quantity");
      const newItems = [...items];
      newItems[existingItemIndex].quantity += quantity;
      setItems(newItems);

      const displayName = variation ?
        `${product.name} (${variation.name})` :
        product.name;

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
      };

      if (variation) {
        newItem.variationId = variation.id;
        newItem.variation = variation;
      }

      console.log("CartContext: New cart item created:", newItem);

      setItems(prevItems => {
        console.log("CartContext: Previous items:", prevItems);
        const updatedItems = [...prevItems, newItem];
        console.log("CartContext: Updated items array:", updatedItems);
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

  const clearCart = () => {
    setItems([]);
    setSeniorDiscounts([]);
    setOtherDiscount(null);
    setTotalDiners(1);
    toast.info('Cart cleared');
    console.log("CartContext: Cart cleared");
  };

  const applyDiscounts = (newSeniorDiscounts: SeniorDiscount[], newOtherDiscount?: OtherDiscount | null, newTotalDiners: number = 1) => {
    setSeniorDiscounts(newSeniorDiscounts);
    setOtherDiscount(newOtherDiscount || null);
    setTotalDiners(newTotalDiners);
  };

  console.log("CartContext: Provider rendering with items:", items.length);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        subtotal: calculations.grossSubtotal,
        tax: calculations.adjustedVAT,
        total: calculations.finalTotal,
        itemCount,
        storeId,
        // New discount management
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
