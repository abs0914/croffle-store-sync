export interface RefundedItem {
  productId: string;
  productName: string;
  quantity: number;
  originalQuantity: number;
  unitPrice: number;
  totalRefund: number;
  returnToStock: boolean;
  isDamaged: boolean;
}

export interface RefundData {
  id?: string;
  storeId: string;
  originalTransactionId: string;
  originalReceiptNumber: string;
  refundReceiptNumber?: string;
  refundType: 'full' | 'partial';
  refundReasonCategory: string;
  refundReason: string;
  refundNotes?: string;
  refundedItems: RefundedItem[];
  originalTransactionTotal: number;
  refundAmount: number;
  refundVatAmount?: number;
  refundMethod: string;
  refundMethodDetails?: Record<string, any>;
  itemsReturnedToStock?: RefundedItem[];
  itemsDamaged?: RefundedItem[];
  processedByUserId: string;
  processedByName: string;
  authorizedByUserId?: string;
  authorizedByName?: string;
  terminalId?: string;
  shiftId?: string;
  refundDate?: string;
}

export interface RefundEligibility {
  eligible: boolean;
  reason?: string;
  originalTransaction?: any;
  existingRefunds?: any[];
  totalRefundedAmount?: number;
  remainingRefundable?: number;
}

export const REFUND_REASON_CATEGORIES = [
  { value: 'product_defect', label: 'Product Defect' },
  { value: 'customer_dissatisfaction', label: 'Customer Dissatisfaction' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'price_dispute', label: 'Price Dispute' },
  { value: 'policy_return', label: 'Policy Return (within window)' },
  { value: 'duplicate_charge', label: 'Duplicate Charge' },
  { value: 'other', label: 'Other' },
] as const;
