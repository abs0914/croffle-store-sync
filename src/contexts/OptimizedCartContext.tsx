
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { Product, ProductVariation } from '@/types';

interface CartItem {
  id: string;
  product: Product;
  productId: string;
  variation?: ProductVariation;
  variationId?: string;
  quantity: number;
  price: number;
}

interface CartContextProps {
  items: CartItem[];
  addToCart: (product: Product, variation?: ProductVariation, quantity?: number) => void;
  removeFromCart: (productId: string, variationId?: string) => void;
  updateQuantity: (productId: string, variationId: string | undefined, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextProps | undefined>(undefined);

export function useOptimizedCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useOptimizedCart must be used within a OptimizedCartProvider');
  }
  return context;
}

// Export individual hooks for backwards compatibility
export function useCartState() {
  const { items } = useOptimizedCart();
  return { items };
}

export function useCartActions() {
  const { addToCart, removeFromCart, updateQuantity, clearCart } = useOptimizedCart();
  return { 
    addItem: addToCart,
    removeItem: (index: number) => {
      // Convert index-based removal to product-based removal
      const item = useOptimizedCart().items[index];
      if (item) {
        removeFromCart(item.productId, item.variationId);
      }
    },
    updateQuantity: (index: number, quantity: number) => {
      // Convert index-based update to product-based update
      const item = useOptimizedCart().items[index];
      if (item) {
        updateQuantity(item.productId, item.variationId, quantity);
      }
    },
    clearCart 
  };
}

export function useCartCalculations() {
  const { getSubtotal, items } = useOptimizedCart();
  const subtotal = getSubtotal();
  const tax = subtotal * 0.12; // 12% VAT
  const total = subtotal;
  
  return { subtotal, tax, total };
}

export function OptimizedCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const getItemCount = useCallback(() => {
    return items.reduce((total, item) => total + item.quantity, 0);
  }, [items]);

  const getSubtotal = useCallback(() => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }, [items]);

  const addToCart = useCallback((product: Product, variation?: ProductVariation, quantity = 1) => {
    setItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => 
        item.productId === product.id && item.variationId === variation?.id
      );

      if (existingItemIndex >= 0) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += quantity;
        return updatedItems;
      }

      const newItem: CartItem = {
        id: `${product.id}-${variation?.id || 'base'}-${Date.now()}`, // Generate unique ID
        product,
        productId: product.id,
        variation,
        variationId: variation?.id,
        quantity,
        price: variation?.price || product.price,
      };

      return [...prevItems, newItem];
    });
  }, []);

  const removeFromCart = useCallback((productId: string, variationId?: string) => {
    setItems(prevItems =>
      prevItems.filter(item => item.productId !== productId || item.variationId !== variationId)
    );
  }, []);

  const updateQuantity = useCallback((productId: string, variationId: string | undefined, quantity: number) => {
    setItems(prevItems => {
      return prevItems.map(item => {
        if (item.productId === productId && item.variationId === variationId) {
          return { ...item, quantity: Math.max(1, quantity) };
        }
        return item;
      });
    });
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value: CartContextProps = {
    items,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getItemCount,
    getSubtotal,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
