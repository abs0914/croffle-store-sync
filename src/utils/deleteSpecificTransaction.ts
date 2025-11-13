/**
 * Utility to delete a specific transaction
 * Run this in browser console: 
 * import('./utils/deleteSpecificTransaction').then(m => m.deleteSpecificTransaction())
 */

import { deleteTransaction } from '@/services/transactions/transactionDeletionService';

export async function deleteSpecificTransaction() {
  const transactionId = '31a396df-7666-4208-9213-40218f3e2985';
  const receiptNumber = '20251113-8458-102036';
  
  console.log('🗑️ Deleting transaction:', receiptNumber);
  
  const result = await deleteTransaction(transactionId, receiptNumber);
  
  if (result.success) {
    console.log('✅ Transaction deleted successfully!');
    console.log(`📦 Reversed ${result.inventoryReversed} inventory movements`);
  } else {
    console.error('❌ Failed to delete transaction:', result.error);
  }
  
  return result;
}

// Auto-execute
deleteSpecificTransaction();
