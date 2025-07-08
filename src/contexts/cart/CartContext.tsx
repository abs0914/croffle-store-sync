
import { createContext, useContext } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { SeniorDiscount, OtherDiscount, CartCalculations } from "@/services/cart/CartCalculationService";

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
  // Discount management
  seniorDiscounts: SeniorDiscount[];
  otherDiscount: OtherDiscount | null;
  totalDiners: number;
  applyDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: OtherDiscount | null, totalDiners?: number) => void;
  calculations: CartCalculations;
  getCartCalculations: () => CartCalculations;
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
  seniorDiscounts: [],
  otherDiscount: null,
  totalDiners: 1,
  applyDiscounts: () => {},
  calculations: {
    grossSubtotal: 0,
    netAmount: 0,
    standardVAT: 0,
    vatExemption: 0,
    adjustedVAT: 0,
    seniorDiscountAmount: 0,
    otherDiscountAmount: 0,
    totalDiscountAmount: 0,
    finalTotal: 0,
    vatableSales: 0,
    vatExemptSales: 0,
    zeroRatedSales: 0,
    totalDiners: 1,
    numberOfSeniors: 0
  },
  getCartCalculations: () => initialState.calculations,
};

export const CartContext = createContext<CartState>(initialState);

export const useCart = () => useContext(CartContext);
