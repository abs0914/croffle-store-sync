
import { createContext, useContext } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { SeniorDiscount, OtherDiscount, CartCalculations } from "@/services/cart/CartCalculationService";

export type OrderType = 'dine_in' | 'online_delivery';
export type DeliveryPlatform = 'grab_food' | 'food_panda';

export interface CartState {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, variation?: ProductVariation, customization?: any) => void;
  removeItem: (itemIndex: number) => void;
  updateQuantity: (itemIndex: number, quantity: number) => void;
  updateItemPrice: (itemIndex: number, price: number) => void;
  clearCart: () => void;
  // Cart validation functions
  validateCart: () => Promise<void>;
  cleanInvalidItems: () => Promise<void>;
  refreshCartData: () => Promise<void>;
  subtotal: number;
  tax: number;
  total: number;
  itemCount: number;
  storeId: string | null;
  // Order type management
  orderType: OrderType;
  setOrderType: (orderType: OrderType) => void;
  deliveryPlatform: DeliveryPlatform | null;
  setDeliveryPlatform: (platform: DeliveryPlatform | null) => void;
  deliveryOrderNumber: string;
  setDeliveryOrderNumber: (orderNumber: string) => void;
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
  updateItemPrice: () => {},
  clearCart: () => {},
  // Cart validation functions (no-op in initial state)
  validateCart: async () => {},
  cleanInvalidItems: async () => {},
  refreshCartData: async () => {},
  subtotal: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  storeId: null,
  // Order type defaults
  orderType: 'dine_in',
  setOrderType: () => {},
  deliveryPlatform: null,
  setDeliveryPlatform: () => {},
  deliveryOrderNumber: '',
  setDeliveryOrderNumber: () => {},
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
