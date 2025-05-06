
import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { toast } from "sonner";

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
};

const TAX_RATE = 0.12; // 12% VAT

const CartContext = createContext<CartState>(initialState);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);
  
  useEffect(() => {
    // Recalculate totals when items change
    const newSubtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const newTax = newSubtotal * TAX_RATE;
    
    setSubtotal(newSubtotal);
    setTax(newTax);
    setTotal(newSubtotal + newTax);
    setItemCount(items.reduce((sum, item) => sum + item.quantity, 0));
  }, [items]);

  const addItem = (product: Product, quantity = 1, variation?: ProductVariation) => {
    const itemPrice = variation ? variation.price : product.price;
    
    // Check if the item already exists in cart
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
      toast.success(`Updated quantity for ${product.name}`);
    } else {
      // Add new item
      const newItem: CartItem = {
        productId: product.id,
        product,
        quantity,
        price: itemPrice,
      };
      
      if (variation) {
        newItem.variationId = variation.id;
        newItem.variation = variation;
      }
      
      setItems([...items, newItem]);
      toast.success(`${product.name} added to cart`);
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
    
    const newItems = [...items];
    newItems[itemIndex].quantity = quantity;
    setItems(newItems);
  };
  
  const clearCart = () => {
    setItems([]);
    toast.info('Cart cleared');
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
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
