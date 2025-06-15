import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { toast } from "sonner";
import { useStore } from "./StoreContext";

interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variation?: ProductVariation) => void;
  removeItem: (itemIndex: number) => void;
  updateQuantity: (itemIndex: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  storeId: string | null;
}

const initialState: CartState = {
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  subtotal: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  storeId: null,
};

const TAX_RATE = 0.12; // 12% VAT (Philippines) - using VAT-inclusive pricing

const CartContext = createContext<CartState>(initialState);

export function CartProvider({ children }: { children: ReactNode }) {
  const { currentStore } = useStore();
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  const [storeId, setStoreId] = useState<string | null>(null);

  // Update storeId when currentStore changes
  useEffect(() => {
    if (currentStore?.id) {
      setStoreId(currentStore.id);
      console.log("CartContext: Current store set:", currentStore.id);
    }
  }, [currentStore]);

  useEffect(() => {
    // Recalculate totals when items change
    // Treat prices as VAT-inclusive (Philippine standard)
    const newTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Calculate net amount (price without VAT) and VAT amount from VAT-inclusive total
    const newNetAmount = newTotal / (1 + TAX_RATE); // Total / 1.12
    const newTax = newTotal - newNetAmount; // VAT amount embedded in the total

    setSubtotal(newTotal); // This is actually the VAT-inclusive total
    setTax(newTax);
    setTotal(newTotal); // Total remains the same as subtotal for VAT-inclusive pricing
    setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));

    // Debug log to check if items are being updated
    console.log("CartContext: Cart items updated (VAT-inclusive):", {
      itemsCount: items.length,
      vatInclusiveTotal: newTotal,
      netAmount: newNetAmount,
      vatAmount: newTax,
      items: items.map(item => ({ name: item.product.name, quantity: item.quantity, price: item.price }))
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

    // Check if we have a store selected
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

    // Check if the item already exists in cart with the same variation or lack thereof
    const existingItemIndex = items.findIndex(item => {
      if (variation) {
        return item.productId === product.id && item.variationId === variation.id;
      }
      return item.productId === product.id && !item.variationId;
    });

    console.log("CartContext: Existing item index:", existingItemIndex);
    console.log("CartContext: Current items before addition:", items);

    if (existingItemIndex !== -1) {
      // Update quantity if item exists
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
      // Add new item
      console.log("CartContext: Creating new item for cart");
      const newItem: CartItem = {
        productId: product.id,
        product: {
          ...product,
          is_active: product.is_active || product.isActive || true,
          stock_quantity: product.stock_quantity || product.stockQuantity || 0
        },
        quantity,
        price: itemPrice,
      };

      if (variation) {
        newItem.variationId = variation.id;
        newItem.variation = variation;
      }

      console.log("CartContext: New cart item created:", newItem);

      // Use functional update to guarantee we're working with latest state
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

export const useCart = () => useContext(CartContext);
