/**
 * Transaction Audit Logger
 * Logs all transaction-related events to bir_audit_logs for BIR compliance
 */

import { supabase } from "@/integrations/supabase/client";

export type AuditEventType = 
  | 'TRANSACTION_COMPLETED'
  | 'TRANSACTION_VOIDED'
  | 'REFUND_PROCESSED'
  | 'Z_READING_GENERATED'
  | 'X_READING_GENERATED'
  | 'PRICE_CHANGE'
  | 'INVENTORY_ADJUSTMENT'
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'SETTINGS_CHANGE';

export type AuditLogType = 
  | 'transaction'
  | 'void'
  | 'refund'
  | 'reading'
  | 'inventory'
  | 'user'
  | 'system';

interface AuditLogEntry {
  storeId: string;
  eventName: AuditEventType;
  logType: AuditLogType;
  transactionId?: string;
  receiptNumber?: string;
  terminalId?: string;
  userId?: string;
  cashierName?: string;
  eventData: Record<string, any>;
}

/**
 * Generate a simple hash for audit log integrity
 */
function generateHash(data: Record<string, any>, previousHash: string | null): string {
  const dataString = JSON.stringify(data) + (previousHash || '');
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Get the next sequence number for audit logs
 */
async function getNextSequenceNumber(storeId: string): Promise<number> {
  const { data } = await supabase
    .from('bir_audit_logs')
    .select('sequence_number')
    .eq('store_id', storeId)
    .order('sequence_number', { ascending: false })
    .limit(1);

  return (data?.[0]?.sequence_number || 0) + 1;
}

/**
 * Get the previous hash for chain integrity
 */
async function getPreviousHash(storeId: string): Promise<string | null> {
  const { data } = await supabase
    .from('bir_audit_logs')
    .select('hash_value')
    .eq('store_id', storeId)
    .order('sequence_number', { ascending: false })
    .limit(1);

  return data?.[0]?.hash_value || null;
}

/**
 * Log an audit event to the database
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<boolean> {
  try {
    const sequenceNumber = await getNextSequenceNumber(entry.storeId);
    const previousHash = await getPreviousHash(entry.storeId);
    
    const eventDataWithMeta = {
      ...entry.eventData,
      timestamp: new Date().toISOString(),
      sequenceNumber,
    };
    
    const hashValue = generateHash(eventDataWithMeta, previousHash);

    const { error } = await supabase
      .from('bir_audit_logs')
      .insert({
        store_id: entry.storeId,
        event_name: entry.eventName,
        log_type: entry.logType,
        transaction_id: entry.transactionId,
        receipt_number: entry.receiptNumber,
        terminal_id: entry.terminalId || 'TERMINAL-01',
        user_id: entry.userId,
        cashier_name: entry.cashierName,
        event_data: eventDataWithMeta,
        sequence_number: sequenceNumber,
        hash_value: hashValue,
        previous_hash: previousHash,
      });

    if (error) {
      console.error('❌ Failed to log audit event:', error);
      return false;
    }

    console.log(`✅ Audit logged: ${entry.eventName} [seq: ${sequenceNumber}]`);
    return true;
  } catch (error) {
    console.error('❌ Audit logging error:', error);
    return false;
  }
}

/**
 * Log a completed transaction
 */
export async function logTransactionCompleted(
  storeId: string,
  transactionId: string,
  receiptNumber: string,
  userId: string,
  cashierName: string,
  transactionData: {
    total: number;
    subtotal: number;
    tax: number;
    discount: number;
    discountType?: string;
    paymentMethod: string;
    itemCount: number;
    orderType?: string;
  }
): Promise<boolean> {
  return logAuditEvent({
    storeId,
    eventName: 'TRANSACTION_COMPLETED',
    logType: 'transaction',
    transactionId,
    receiptNumber,
    userId,
    cashierName,
    eventData: {
      action: 'Transaction completed',
      total: transactionData.total,
      subtotal: transactionData.subtotal,
      tax: transactionData.tax,
      discount: transactionData.discount,
      discountType: transactionData.discountType || 'none',
      paymentMethod: transactionData.paymentMethod,
      itemCount: transactionData.itemCount,
      orderType: transactionData.orderType || 'dine_in',
    },
  });
}

/**
 * Log a voided transaction
 */
export async function logTransactionVoided(
  storeId: string,
  originalTransactionId: string,
  originalReceiptNumber: string,
  voidReceiptNumber: string,
  userId: string,
  cashierName: string,
  voidData: {
    originalTotal: number;
    reasonCategory: string;
    reason: string;
    authorizedBy?: string;
  }
): Promise<boolean> {
  return logAuditEvent({
    storeId,
    eventName: 'TRANSACTION_VOIDED',
    logType: 'void',
    transactionId: originalTransactionId,
    receiptNumber: voidReceiptNumber,
    userId,
    cashierName,
    eventData: {
      action: 'Transaction voided',
      originalReceiptNumber,
      voidReceiptNumber,
      originalTotal: voidData.originalTotal,
      reasonCategory: voidData.reasonCategory,
      reason: voidData.reason,
      authorizedBy: voidData.authorizedBy || 'N/A',
    },
  });
}

/**
 * Log a processed refund
 */
export async function logRefundProcessed(
  storeId: string,
  originalTransactionId: string,
  originalReceiptNumber: string,
  refundReceiptNumber: string,
  userId: string,
  processedByName: string,
  refundData: {
    refundAmount: number;
    refundType: string;
    reasonCategory: string;
    reason: string;
    itemsRefunded: number;
    authorizedBy?: string;
  }
): Promise<boolean> {
  return logAuditEvent({
    storeId,
    eventName: 'REFUND_PROCESSED',
    logType: 'refund',
    transactionId: originalTransactionId,
    receiptNumber: refundReceiptNumber,
    userId,
    cashierName: processedByName,
    eventData: {
      action: 'Refund processed',
      originalReceiptNumber,
      refundReceiptNumber,
      refundAmount: refundData.refundAmount,
      refundType: refundData.refundType,
      reasonCategory: refundData.reasonCategory,
      reason: refundData.reason,
      itemsRefunded: refundData.itemsRefunded,
      authorizedBy: refundData.authorizedBy || 'N/A',
    },
  });
}

/**
 * Log Z-Reading generation
 */
export async function logZReadingGenerated(
  storeId: string,
  userId: string,
  generatedByName: string,
  zReadingData: {
    readingNumber: number;
    grossSales: number;
    netSales: number;
    totalTransactions: number;
    vatAmount: number;
    totalDiscounts: number;
    beginningReceiptNumber?: string;
    endingReceiptNumber?: string;
  }
): Promise<boolean> {
  return logAuditEvent({
    storeId,
    eventName: 'Z_READING_GENERATED',
    logType: 'reading',
    userId,
    cashierName: generatedByName,
    eventData: {
      action: 'Z-Reading generated (End of Day)',
      readingNumber: zReadingData.readingNumber,
      grossSales: zReadingData.grossSales,
      netSales: zReadingData.netSales,
      totalTransactions: zReadingData.totalTransactions,
      vatAmount: zReadingData.vatAmount,
      totalDiscounts: zReadingData.totalDiscounts,
      beginningReceiptNumber: zReadingData.beginningReceiptNumber || 'N/A',
      endingReceiptNumber: zReadingData.endingReceiptNumber || 'N/A',
    },
  });
}

/**
 * Log X-Reading generation
 */
export async function logXReadingGenerated(
  storeId: string,
  userId: string,
  generatedByName: string,
  xReadingData: {
    readingNumber: number;
    grossSales: number;
    netSales: number;
    totalTransactions: number;
  }
): Promise<boolean> {
  return logAuditEvent({
    storeId,
    eventName: 'X_READING_GENERATED',
    logType: 'reading',
    userId,
    cashierName: generatedByName,
    eventData: {
      action: 'X-Reading generated (Current sales)',
      readingNumber: xReadingData.readingNumber,
      grossSales: xReadingData.grossSales,
      netSales: xReadingData.netSales,
      totalTransactions: xReadingData.totalTransactions,
    },
  });
}

export const TransactionAuditLogger = {
  logAuditEvent,
  logTransactionCompleted,
  logTransactionVoided,
  logRefundProcessed,
  logZReadingGenerated,
  logXReadingGenerated,
};
