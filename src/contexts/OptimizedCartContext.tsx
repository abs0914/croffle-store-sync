
import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';
import { CartItem, Product, ProductVariation } from '@/types';

interface CartState {
  items: CartItem[];
}

interface CartActions {
  addItem: (product: Product, quantity?: number, variation?: ProductVariation) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
}

interface CartCalculations {
  subtotal: number;
  tax: number;
  total: number;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number; variation?: ProductVariation } }
  | { type: 'REMOVE_ITEM'; payload: { index: number } }
  | { type: 'UPDATE_QUANTITY'; payload: { index: number; quantity: number } }
  | { type: 'CLEAR_CART' };

const CartStateContext = createContext<CartState | undefined>(undefined);
const CartActionsContext = createContext<CartActions | undefined>(undefined);
const CartCalculationsContext = createContext<CartCalculations | undefined>(undefined);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity, variation } = action.payload;
      const price = variation ? variation.price : product.price;
      
      const newItem: CartItem = {
        product,
        productId: product.id,
        variation,
        variationId: variation?.id,
        quantity,
        price,
      };

      return { items: [...state.items, newItem] };
    }
    case 'REMOVE_ITEM':
      return {
        items: state.items.filter((_, index) => index !== action.payload.index)
      };
    case 'UPDATE_QUANTITY':
      return {
        items: state.items.map((item, index) =>
          index === action.payload.index
            ? { ...item, quantity: action.payload.quantity }
            : item
        )
      };
    case 'CLEAR_CART':
      return { items: [] };
    default:
      return state;
  }
}

export function OptimizedCartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });

  // Memoized calculations
  const calculations = useMemo(() => {
    const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.12; // 12% VAT
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  }, [state.items]);

  // Memoized actions to prevent re-renders
  const actions = useMemo(() => ({
    addItem: (product: Product, quantity = 1, variation?: ProductVariation) => {
      dispatch({ type: 'ADD_ITEM', payload: { product, quantity, variation } });
    },
    removeItem: (index: number) => {
      dispatch({ type: 'REMOVE_ITEM', payload: { index } });
    },
    updateQuantity: (index: number, quantity: number) => {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { index, quantity } });
    },
    clearCart: () => {
      dispatch({ type: 'CLEAR_CART' });
    }
  }), []);

  return (
    <CartStateContext.Provider value={state}>
      <CartActionsContext.Provider value={actions}>
        <CartCalculationsContext.Provider value={calculations}>
          {children}
        </CartCalculationsContext.Provider>
      </CartActionsContext.Provider>
    </CartStateContext.Provider>
  );
}

export function useCartState() {
  const context = useContext(CartStateContext);
  if (context === undefined) {
    throw new Error('useCartState must be used within an OptimizedCartProvider');
  }
  return context;
}

export function useCartActions() {
  const context = useContext(CartActionsContext);
  if (context === undefined) {
    throw new Error('useCartActions must be used within an OptimizedCartProvider');
  }
  return context;
}

export function useCartCalculations() {
  const context = useContext(CartCalculationsContext);
  if (context === undefined) {
    throw new Error('useCartCalculations must be used within an OptimizedCartProvider');
  }
  return context;
}

// Backwards compatibility hook
export function useOptimizedCart() {
  const state = useCartState();
  const actions = useCartActions();
  const calculations = useCartCalculations();
  
  return {
    ...state,
    ...actions,
    ...calculations
  };
}
