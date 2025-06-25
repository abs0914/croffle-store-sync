
import { useState, useEffect, ReactNode } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { toast } from "sonner";
import { useStore } from "../StoreContext";
import { CartContext } from "./CartContext";

const TAX_RATE = 0.12; // 12% VAT (Philippines), VAT-inclusive

export function CartProvider({ children }: { children: ReactNode }) {
  const { currentStore } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (currentStore?.id) {
      setStoreId(currentStore.id);
      console.log("CartContext: Current store set:", currentStore.id);
    }
  }, [currentStore]);

  useEffect(() => {
    const newTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newNetAmount = newTotal / (1 + TAX_RATE);
    const newTax = newTotal - newNetAmount;
    setSubtotal(newTotal);
    setTax(newTax);
    setTotal(newTotal);
    setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));

    console.log("CartContext: Cart items updated (VAT-inclusive):", {
      itemsCount: items.length,
      vatInclusiveTotal: newTotal,
      netAmount: newNetAmount,
      vatAmount: newTax,
      items: items.map(item => ({ name: item.product.name, quantity: item.quantity, price: item.price })),
    });
  }, [items]);

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
        id: `${product.id}-${variation?.id || 'base'}-${Date.now()}`, // Generate unique ID
        productId: product.id,
        product: {
          ...product,
          is_active: product.is_active || product.isActive || true,
          stock_quantity: product.stock_quantity || 0,
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
    toast.info('Cart cleared');
    console.log("CartContext: Cart cleared");
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
        subtotal,
        tax,
        total,
        itemCount,
        storeId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}
