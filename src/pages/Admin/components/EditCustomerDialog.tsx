import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store } from '@/types';
import { CustomerWithStats } from '../types/adminTypes';

interface EditCustomerDialogProps {
  customer: CustomerWithStats | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerUpdated: () => void;
  onCustomerDeleted: () => void;
  stores: Store[];
}

export const EditCustomerDialog: React.FC<EditCustomerDialogProps> = ({
  customer,
  isOpen,
  onOpenChange,
  onCustomerUpdated,
  onCustomerDeleted,
  stores
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    storeId: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      fetchCustomerDetails();
    }
  }, [customer, isOpen]);

  const fetchCustomerDetails = async () => {
    if (!customer) return;
    
    setIsLoading(true);
    try {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customer.id)
        .single();

      if (customerError) throw customerError;

      setFormData({
        name: customerData.name || '',
        email: customerData.email || '',
        phone: customerData.phone || '',
        storeId: customerData.store_id || ''
      });
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      toast.error('Failed to load customer details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    setIsUpdating(true);
    try {
      // Update customer
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone,
          store_id: formData.storeId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (updateError) throw updateError;

      toast.success('Customer updated successfully');
      onCustomerUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating customer:', error);
      toast.error('Failed to update customer');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!customer) return;

    try {
      // Check if customer has transactions
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('id')
        .eq('customer_id', customer.id)
        .limit(1);

      if (transactionError) throw transactionError;

      if (transactions && transactions.length > 0) {
        // Show confirmation for customers with transactions
        if (!confirm('This customer has transaction history. They will be marked as inactive instead of being permanently deleted. Continue?')) {
          return;
        }
        
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
        // No transactions, confirm permanent deletion
        if (!confirm('Are you sure you want to permanently delete this customer? This action cannot be undone.')) {
          return;
        }
        
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
    }
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Customer - {customer.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-gray-500">Loading customer details...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="store">Store</Label>
                <Select value={formData.storeId || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, storeId: value === "none" ? "" : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select store" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Store</SelectItem>
                    {stores.map((store) => (
                      <SelectItem key={store.id} value={store.id}>
                        {store.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <div className="text-sm text-gray-500">Total Orders</div>
                <div className="text-lg font-semibold">{customer.totalOrders}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Total Spent</div>
                <div className="text-lg font-semibold">₱{customer.totalSpent.toFixed(2)}</div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-500">Loyalty Points</div>
                <div className="text-lg font-semibold">{customer.loyaltyPoints}</div>
              </div>
            </div>

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={isUpdating}
              >
                Delete Customer
              </Button>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating}>
                  {isUpdating ? 'Updating...' : 'Update Customer'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};