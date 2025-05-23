
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface StockAdjustment {
  type: 'add' | 'remove' | 'adjustment';
  quantity: number;
  notes: string;
}

interface UseStockOperationsProps {
  productId: string | undefined;
}

export const useStockOperations = ({ productId }: UseStockOperationsProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [stockAdjustment, setStockAdjustment] = useState<StockAdjustment>({
    type: 'adjustment',
    quantity: 0,
    notes: '',
  });

  const handleStockAdjustmentInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStockAdjustment(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveStockAdjustment = async () => {
    if (!productId) {
      toast.error('Product ID is missing.');
      return;
    }

    if (!user?.id) {
      toast.error('User information is missing.');
      return;
    }

    const { type, quantity, notes } = stockAdjustment;

    if (!type || !quantity) {
      toast.error('Please specify both type and quantity.');
      return;
    }

    const quantityNumber = Number(quantity);

    if (isNaN(quantityNumber)) {
      toast.error('Invalid quantity.');
      return;
    }

    try {
      // Call the appropriate Supabase function based on stock adjustment type
      let result;
      
      // For the product inventory adjustment, we'll use a direct update instead
      // since the transfer_inventory_stock function doesn't match our needs
      if (type === 'adjustment') {
        // Get current product data - make sure to select both stock_quantity AND store_id
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('stock_quantity, store_id')
          .eq('id', productId)
          .single();
        
        if (fetchError) throw fetchError;
        
        // Update the product with new quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: quantityNumber })
          .eq('id', productId);
          
        if (updateError) throw updateError;
        
        // Log the inventory transaction
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            store_id: product ? product.store_id : '', // Now store_id will be available
            product_id: productId,
            transaction_type: 'adjustment',
            quantity: Math.abs(quantityNumber - (product?.stock_quantity || 0)),
            previous_quantity: product?.stock_quantity || 0,
            new_quantity: quantityNumber,
            created_by: user.id,
            notes: notes || 'Manual stock adjustment'
          });
        
        if (transactionError) throw transactionError;
        
      } else if (type === 'add' || type === 'remove') {
        // Get current product data
        const { data: product, error: fetchError } = await supabase
          .from('products')
          .select('stock_quantity, store_id')
          .eq('id', productId)
          .single();
        
        if (fetchError) throw fetchError;
        
        const currentQuantity = product?.stock_quantity || 0;
        const newQuantity = type === 'add' 
          ? currentQuantity + quantityNumber 
          : Math.max(0, currentQuantity - quantityNumber);
        
        // Update the product with new quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ stock_quantity: newQuantity })
          .eq('id', productId);
          
        if (updateError) throw updateError;
        
        // Log the inventory transaction
        const { error: transactionError } = await supabase
          .from('inventory_transactions')
          .insert({
            store_id: product?.store_id || '',
            product_id: productId,
            transaction_type: type === 'add' ? 'add' : 'remove',
            quantity: quantityNumber,
            previous_quantity: currentQuantity,
            new_quantity: newQuantity,
            created_by: user.id,
            notes: notes || `Manual stock ${type}`
          });
        
        if (transactionError) throw transactionError;
      }

      toast.success('Stock adjusted successfully!');
      // Invalidate relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['inventoryTransactions'] });
      // Reset the stock adjustment state
      setStockAdjustment({
        type: 'adjustment',
        quantity: 0,
        notes: '',
      });
    } catch (error: any) {
      console.error('Stock adjustment failed:', error);
      toast.error(`Failed to adjust stock: ${error.message}`);
    }
  };

  return {
    stockAdjustment,
    handleStockAdjustmentInputChange,
    handleSaveStockAdjustment,
  };
};
