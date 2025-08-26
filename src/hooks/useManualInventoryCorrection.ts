import { useState } from 'react';
import { toast } from 'sonner';
import { correctTransactionInventory, batchCorrectInventory, ReconciliationResult } from '@/services/inventory/inventoryReconciliation';

export const useManualInventoryCorrection = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ReconciliationResult[]>([]);

  const correctSingleTransaction = async (transactionId: string) => {
    setLoading(true);
    try {
      const result = await correctTransactionInventory(transactionId);
      setResults(prev => [...prev, result]);
      
      if (result.success) {
        toast.success(`Successfully corrected ${result.corrections_made} items for transaction ${transactionId}`);
      } else {
        toast.error(`Failed to correct transaction ${transactionId}: ${result.errors.join(', ')}`);
      }
      
      return result;
    } catch (error) {
      console.error('Error in manual correction:', error);
      toast.error('Failed to perform manual correction');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const correctMultipleTransactions = async (transactionIds: string[]) => {
    setLoading(true);
    try {
      const results = await batchCorrectInventory(transactionIds);
      setResults(prev => [...prev, ...results]);
      
      const successCount = results.filter(r => r.success).length;
      const totalCorrections = results.reduce((sum, r) => sum + r.corrections_made, 0);
      
      toast.success(`Corrected ${totalCorrections} items across ${successCount}/${results.length} transactions`);
      
      return results;
    } catch (error) {
      console.error('Error in batch correction:', error);
      toast.error('Failed to perform batch correction');
      return [];
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return {
    loading,
    results,
    correctSingleTransaction,
    correctMultipleTransactions,
    clearResults
  };
};