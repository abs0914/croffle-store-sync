
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Customer } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/contexts/StoreContext';

interface CustomerSelectorProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

export const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  selectedCustomer,
  onCustomerSelect
}) => {
  const { currentStore } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
  }, [searchTerm]);

  const searchCustomers = async () => {
    if (!currentStore?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', currentStore.id)
        .or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Customer (Optional)</Label>
      
      {selectedCustomer ? (
        <div className="flex items-center justify-between p-2 border rounded">
          <div>
            <span className="font-medium">{selectedCustomer.name}</span>
            <span className="text-sm text-muted-foreground ml-2">
              {selectedCustomer.phone}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCustomerSelect(null)}
          >
            Remove
          </Button>
        </div>
      ) : (
        <div>
          <Input
            placeholder="Search customer by name, phone, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          {customers.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto border rounded">
              {customers.map((customer) => (
                <div
                  key={customer.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    onCustomerSelect(customer);
                    setSearchTerm('');
                    setCustomers([]);
                  }}
                >
                  <div className="font-medium">{customer.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {customer.phone} {customer.email && `• ${customer.email}`}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {isLoading && (
            <div className="text-sm text-muted-foreground mt-1">
              Searching...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
