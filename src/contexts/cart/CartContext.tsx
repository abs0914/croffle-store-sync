
import { createContext, useContext } from "react";
import { CartItem, Product, ProductVariation } from "@/types";

export interface CartState {
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

export const CartContext = createContext<CartState>(initialState);

export const useCart = () => useContext(CartContext);
