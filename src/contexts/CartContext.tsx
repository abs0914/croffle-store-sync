
import React, { createContext, useContext, useReducer, useCallback } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  variationId?: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: Omit<CartItem, 'subtotal'> }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { id: string } }
  | { type: 'CLEAR_CART' }
  | { type: 'UPDATE_NOTES'; payload: { id: string; notes: string } };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(item => 
        item.productId === action.payload.productId && 
        item.variationId === action.payload.variationId
      );

      let newItems: CartItem[];
      
      if (existingItemIndex >= 0) {
        newItems = state.items.map((item, index) => 
          index === existingItemIndex
            ? { 
                ...item, 
                quantity: item.quantity + action.payload.quantity,
                subtotal: (item.quantity + action.payload.quantity) * item.price
              }
            : item
        );
      } else {
        const newItem: CartItem = {
          ...action.payload,
          subtotal: action.payload.price * action.payload.quantity
        };
        newItems = [...state.items, newItem];
      }

      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const itemCount = newItems.reduce((count, item) => count + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }

    case 'UPDATE_QUANTITY': {
      if (action.payload.quantity <= 0) {
        const newItems = state.items.filter(item => item.id !== action.payload.id);
        const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
        const itemCount = newItems.reduce((count, item) => count + item.quantity, 0);
        return { items: newItems, total, itemCount };
      }

      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { 
              ...item, 
              quantity: action.payload.quantity,
              subtotal: action.payload.quantity * item.price
            }
          : item
      );

      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const itemCount = newItems.reduce((count, item) => count + item.quantity, 0);

      return { items: newItems, total, itemCount };
    }

    case 'REMOVE_ITEM': {
      const newItems = state.items.filter(item => item.id !== action.payload.id);
      const total = newItems.reduce((sum, item) => sum + item.subtotal, 0);
      const itemCount = newItems.reduce((count, item) => count + item.quantity, 0);
      return { items: newItems, total, itemCount };
    }

    case 'UPDATE_NOTES': {
      const newItems = state.items.map(item =>
        item.id === action.payload.id
          ? { ...item, notes: action.payload.notes }
          : item
      );
      return { ...state, items: newItems };
    }

    case 'CLEAR_CART':
      return { items: [], total: 0, itemCount: 0 };

    default:
      return state;
  }
};

interface CartContextType {
  state: CartState;
  addItem: (item: Omit<CartItem, 'subtotal'>) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  updateNotes: (id: string, notes: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, { items: [], total: 0, itemCount: 0 });

  const addItem = useCallback((item: Omit<CartItem, 'subtotal'>) => {
    dispatch({ type: 'ADD_ITEM', payload: item });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  }, []);

  const removeItem = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { id } });
  }, []);

  const updateNotes = useCallback((id: string, notes: string) => {
    dispatch({ type: 'UPDATE_NOTES', payload: { id, notes } });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  return (
    <CartContext.Provider value={{
      state,
      addItem,
      updateQuantity,
      removeItem,
      updateNotes,
      clearCart
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
