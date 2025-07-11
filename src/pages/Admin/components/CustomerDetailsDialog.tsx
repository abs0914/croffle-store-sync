import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Phone, Building2, ShoppingBag, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Store } from '@/types';
import { CustomerWithStats } from '../types/adminTypes';

interface CustomerDetailsDialogProps {
  customer: CustomerWithStats | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  stores: Store[];
}

interface Transaction {
  id: string;
  total: number;
  created_at: string;
  receipt_number: string;
  payment_method: string;
  status: string;
}

export const CustomerDetailsDialog: React.FC<CustomerDetailsDialogProps> = ({
  customer,
  isOpen,
  onOpenChange,
  stores
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      fetchCustomerTransactions();
    }
  }, [customer, isOpen]);

  const fetchCustomerTransactions = async () => {
    if (!customer) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, total, created_at, receipt_number, payment_method, status')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load customer transactions');
    } finally {
      setIsLoading(false);
    }
  };

  if (!customer) return null;

  const store = stores.find(s => s.id === customer.storeId);
  const isActive = customer.lastOrderDate && 
    new Date(customer.lastOrderDate) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const averageOrderValue = customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <User className="h-5 w-5" />
            {customer.name}
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span>{customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  {store && (
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span>{store.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span>Joined: {new Date(customer.registrationDate).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Purchase Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-1">
                        <ShoppingBag className="h-4 w-4" />
                        <span>Total Orders</span>
                      </div>
                      <div className="text-2xl font-bold">{customer.totalOrders}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-1">
                        <DollarSign className="h-4 w-4" />
                        <span>Total Spent</span>
                      </div>
                      <div className="text-2xl font-bold">₱{customer.totalSpent.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span>Avg Order</span>
                      </div>
                      <div className="text-2xl font-bold">₱{averageOrderValue.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500 mb-1">Loyalty Points</div>
                      <div className="text-2xl font-bold">{customer.loyaltyPoints}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {customer.lastOrderDate && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Last order: {new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading transactions...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions found for this customer.
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <Card key={transaction.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Receipt #{transaction.receipt_number}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.created_at).toLocaleDateString()} • {transaction.payment_method}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₱{transaction.total.toFixed(2)}</div>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Lifetime Value:</span>
                      <span className="font-semibold">₱{customer.totalSpent.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Average Order Value:</span>
                      <span className="font-semibold">₱{averageOrderValue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Order Frequency:</span>
                      <span className="font-semibold">
                        {customer.totalOrders} orders
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Customer Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Registration Date:</span>
                      <span>{new Date(customer.registrationDate).toLocaleDateString()}</span>
                    </div>
                    {customer.lastOrderDate && (
                      <div className="flex justify-between">
                        <span>Last Visit:</span>
                        <span>{new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Customer Type:</span>
                      <Badge variant={isActive ? 'default' : 'secondary'}>
                        {isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};