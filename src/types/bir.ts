export interface BIRAuditLog {
  id: string;
  store_id: string;
  log_type: 'transaction' | 'system' | 'modification' | 'access';
  event_name: string;
  event_data: Record<string, any>;
  user_id?: string;
  cashier_name?: string;
  terminal_id: string;
  sequence_number: number;
  hash_value: string;
  previous_hash?: string;
  transaction_id?: string;
  receipt_number?: string;
  created_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface BIRCumulativeSales {
  grandTotalSales: number;
  grandTotalTransactions: number;
  lastTransactionDate?: string;
  lastReceiptNumber?: string;
  id?: string;
  store_id?: string;
  terminal_id?: string;
  grand_total_sales?: number;
  grand_total_transactions?: number;
  last_transaction_date?: string;
  last_receipt_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface BIREJournal {
  id: string;
  store_id: string;
  journal_date: string;
  terminal_id: string;
  journal_data: Record<string, any>;
  beginning_receipt?: string;
  ending_receipt?: string;
  transaction_count: number;
  gross_sales: number;
  net_sales: number;
  vat_sales: number;
  vat_amount: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  is_backed_up: boolean;
  backup_date?: string;
  created_at: string;
}

export interface BIRTransaction {
  vat_sales: number;
  vat_exempt_sales: number;
  zero_rated_sales: number;
  senior_citizen_discount: number;
  pwd_discount: number;
  sequence_number: number;
  terminal_id: string;
}

export interface BIRReceiptData {
  businessName: string;
  taxpayerName: string;
  tin: string;
  address: string;
  receiptNumber: string;
  machineAccreditationNumber: string;
  serialNumber: string;
  terminalId: string;
  transactionDate: string;
  cashierName: string;
  items: Array<{
    quantity: number;
    description: string;
    unitPrice: number;
    amount: number;
    isVatExempt?: boolean;
    isZeroRated?: boolean;
  }>;
  subtotal: number;
  vatableSales: number;
  vatExemptSales: number;
  zeroRatedSales: number;
  vatAmount: number;
  discounts: {
    senior: number;
    pwd: number;
    employee: number;
    athletes_coaches: number;
    solo_parent: number;
    other: number;
    total: number;
  };
  totalAmount: number;
  amountDue: number;
  paymentMethod: string;
  amountTendered?: number;
  change?: number;
}

export interface BIRComplianceStatus {
  isCompliant: boolean;
  missingRequirements: string[];
  lastAuditDate?: string;
  missingFields?: string[];
  warnings?: string[];
  accreditationStatus?: 'pending' | 'approved' | 'expired' | 'rejected';
  nextAuditDate?: string;
}