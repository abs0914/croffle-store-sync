import React, { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CustomerWithStats } from '../types/adminTypes';

interface DeleteCustomerDialogProps {
  customer: CustomerWithStats | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerDeleted: () => void;
}

export const DeleteCustomerDialog: React.FC<DeleteCustomerDialogProps> = ({
  customer,
  isOpen,
  onOpenChange,
  onCustomerDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!customer) return;

    setIsDeleting(true);
    try {
      // Check if customer has transactions
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', customer.id)
        .limit(1);

      if (transactionError) throw transactionError;

      if (transactions && transactions.length > 0) {
        // Customer has transactions, mark as inactive instead of deleting
        const { error: updateError } = await supabase
          .from('customers')
          .update({ 
            is_active: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', customer.id);

        if (updateError) throw updateError;
        toast.success('Customer marked as inactive (has transaction history)');
      } else {
        // No transactions, safe to delete
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .eq('id', customer.id);

        if (deleteError) throw deleteError;
        toast.success('Customer deleted successfully');
      }

      onCustomerDeleted();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      toast.error('Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!customer) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Customer</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{customer.name}</strong>?
            <br />
            <br />
            {customer.totalOrders > 0 ? (
              <span className="text-amber-600">
                This customer has {customer.totalOrders} order(s). The customer will be marked as inactive instead of being permanently deleted to preserve transaction history.
              </span>
            ) : (
              <span className="text-red-600">
                This action cannot be undone and will permanently remove the customer from your records.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : (customer.totalOrders > 0 ? 'Mark Inactive' : 'Delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};