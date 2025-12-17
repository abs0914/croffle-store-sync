
import { createContext, useContext } from "react";
import { CartItem, Product, ProductVariation } from "@/types";
import { SeniorDiscount, OtherDiscount, CartCalculations, DiscountBeneficiary } from "@/services/cart/CartCalculationService";

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
  // Legacy discount management (backward compatibility)
  seniorDiscounts: SeniorDiscount[];
  otherDiscount: OtherDiscount | null;
  totalDiners: number;
  applyDiscounts: (seniorDiscounts: SeniorDiscount[], otherDiscount?: OtherDiscount | null, totalDiners?: number) => void;
  // NEW: Multi-beneficiary discount management
  discountBeneficiaries: DiscountBeneficiary[];
  regularDiners: number;
  applyBeneficiaryDiscounts: (beneficiaries: DiscountBeneficiary[], totalDiners: number, customPercentage?: number) => void;
  customPercentage: number | undefined;
  calculations: CartCalculations;
  getCartCalculations: () => CartCalculations;
}

const initialCalculations: CartCalculations = {
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
  numberOfSeniors: 0,
  beneficiaryBreakdown: [],
  regularDinerCount: 1
};

const initialState: CartState = {
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  updateItemPrice: () => {},
  clearCart: () => {},
  validateCart: async () => {},
  cleanInvalidItems: async () => {},
  refreshCartData: async () => {},
  subtotal: 0,
  tax: 0,
  total: 0,
  itemCount: 0,
  storeId: null,
  orderType: 'dine_in',
  setOrderType: () => {},
  deliveryPlatform: null,
  setDeliveryPlatform: () => {},
  deliveryOrderNumber: '',
  setDeliveryOrderNumber: () => {},
  // Legacy
  seniorDiscounts: [],
  otherDiscount: null,
  totalDiners: 1,
  applyDiscounts: () => {},
  // New
  discountBeneficiaries: [],
  regularDiners: 1,
  applyBeneficiaryDiscounts: () => {},
  customPercentage: undefined,
  calculations: initialCalculations,
  getCartCalculations: () => initialCalculations,
};

export const CartContext = createContext<CartState>(initialState);

export const useCart = () => useContext(CartContext);
