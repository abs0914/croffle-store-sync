import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface StockAdjustment {
  type: 'adjustment' | 'purchase' | 'sale' | 'return' | 'transfer';
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
      const { error } = await supabase.rpc('adjust_product_stock', {
        product_id: productId,
        transaction_type: type,
        quantity: quantityNumber,
        user_id: user.id,
        notes: notes,
      });

      if (error) {
        throw error;
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
