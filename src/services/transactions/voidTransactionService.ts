// Simple stub for void transaction service
export interface VoidTransactionData {
  id: string;
  receiptNumber: string;
  receipt_number?: string; // Legacy support
  total: number;
  createdAt: string;
  created_at?: string; // Legacy support
  status: string;
  reasonCategory?: string;
  voidedBy?: string;
  transactionId?: string;
  reason?: string;
  notes?: string;
  payment_method?: string;
  customers?: any;
  items?: any[];
  discount?: number;
  discount_type?: string;
}

export const voidTransaction = async (transactionData: VoidTransactionData, additionalData?: any) => {
  console.log('Voiding transaction:', transactionData, additionalData);
  
  return { 
    success: true, 
    message: 'Transaction voided successfully' 
  };
};

export const getVoidableTransactions = async (storeId: string, additionalFilters?: any): Promise<VoidTransactionData[]> => {
  // Return empty array for now - implement when needed
  console.log('Getting voidable transactions for store:', storeId, additionalFilters);
  return [];
};

export const VoidTransactionService = {
  voidTransaction,
  getVoidableTransactions
};