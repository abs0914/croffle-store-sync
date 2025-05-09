
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

const TAX_RATE = 0.12; // 12% VAT

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
      console.log("Current store set in CartContext:", currentStore.id);
    }
  }, [currentStore]);

  useEffect(() => {
    // Recalculate totals when items change
    const newSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newTax = newSubtotal * TAX_RATE;
    
    setSubtotal(newSubtotal);
    setTax(newTax);
    setTotal(newSubtotal + newTax);
    setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));
    
    // Debug log to check if items are being updated
    console.log("Cart items updated in CartContext:", items);
  }, [items]);

  const addItem = (product: Product, quantity = 1, variation?: ProductVariation) => {
    // Check if we have a store selected
    if (!currentStore?.id) {
      toast.error("Please select a store first");
      return;
    }

    const itemPrice = variation ? variation.price : product.price;
    
    // Debug log to verify data
    console.log("CartContext: Adding item to cart:", {
      product: product.name,
      quantity,
      price: itemPrice,
      variation: variation ? variation.name : "none"
    });
    
    // Check if the item already exists in cart with the same variation or lack thereof
    const existingItemIndex = items.findIndex(item => {
      if (variation) {
        return item.productId === product.id && item.variationId === variation.id;
      }
      return item.productId === product.id && !item.variationId;
    });
    
    if (existingItemIndex !== -1) {
      // Update quantity if item exists
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
      
      // Use functional update to guarantee we're working with latest state
      setItems(prevItems => [...prevItems, newItem]);
      
      const displayName = variation ? 
        `${product.name} (${variation.name})` : 
        product.name;
      
      toast.success(`${displayName} added to cart`);
      console.log("CartContext: Added new item to cart", displayName);
    }
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
