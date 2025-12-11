/**
 * Utility to delete specific transactions
 * Run this in browser console: 
 * import('./utils/deleteSpecificTransaction').then(m => m.deleteSpecificTransaction())
 */

import { deleteTransaction } from '@/services/transactions/transactionDeletionService';

const transactionsToDelete = [
  { id: 'a3fc05fa-175c-4b31-96c3-a111aec5e270', receiptNumber: '20251211-3206-172806' },
  { id: '6da71e50-5630-4d69-a825-74f4869493e7', receiptNumber: '20251211-2199-195941' },
  { id: '838f76d3-7c16-4eeb-a560-be37fd3af41c', receiptNumber: '20251211-4755-202320' },
];

export async function deleteSpecificTransaction() {
  console.log('🗑️ Starting deletion of', transactionsToDelete.length, 'transactions');
  
  for (const tx of transactionsToDelete) {
    console.log(`\n🗑️ Deleting transaction: ${tx.receiptNumber}`);
    
    const result = await deleteTransaction(tx.id, tx.receiptNumber);
    
    if (result.success) {
      console.log(`✅ ${tx.receiptNumber} deleted successfully!`);
      console.log(`📦 Reversed ${result.inventoryReversed} inventory movements`);
    } else {
      console.error(`❌ Failed to delete ${tx.receiptNumber}:`, result.error);
    }
  }
  
  console.log('\n✅ Deletion process complete');
}

// Auto-execute
deleteSpecificTransaction();
