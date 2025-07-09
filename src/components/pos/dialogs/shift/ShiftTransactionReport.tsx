import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shift } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/format";
import { ShoppingCart, Package2, TrendingDown, Receipt, Clock } from "lucide-react";
import { format } from "date-fns";

interface ShiftTransactionReportProps {
  currentShift: Shift | null;
}

interface Transaction {
  id: string;
  receipt_number: string;
  items: any[];
  total: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
}

interface InventoryTransaction {
  id: string;
  transaction_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  notes: string;
  created_at: string;
  reference_id: string;
}

async function fetchShiftTransactions(shiftId: string, storeId: string) {
  const { data: transactions, error } = await supabase
    .from('transactions')
    .select(`
      id,
      receipt_number,
      items,
      total,
      payment_method,
      created_at,
      customers(name)
    `)
    .eq('shift_id', shiftId)
    .eq('store_id', storeId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return transactions?.map(t => ({
    ...t,
    customer_name: t.customers?.name
  })) || [];
}

async function fetchShiftInventoryTransactions(shiftId: string, storeId: string) {
  // Get transactions from this shift and their related inventory movements
  const { data: shiftTransactions, error: shiftError } = await supabase
    .from('transactions')
    .select('id, receipt_number, created_at')
    .eq('shift_id', shiftId)
    .eq('store_id', storeId)
    .eq('status', 'completed');

  if (shiftError) throw shiftError;
  
  if (!shiftTransactions || shiftTransactions.length === 0) {
    return [];
  }

  const transactionIds = shiftTransactions.map(t => t.id);

  const { data: inventoryTransactions, error } = await supabase
    .from('inventory_transactions')
    .select(`
      id,
      transaction_type,
      quantity,
      previous_quantity,
      new_quantity,
      notes,
      created_at,
      reference_id
    `)
    .eq('store_id', storeId)
    .eq('transaction_type', 'sale')
    .in('reference_id', transactionIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return inventoryTransactions || [];
}

export default function ShiftTransactionReport({ currentShift }: ShiftTransactionReportProps) {
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['shift-transactions', currentShift?.id],
    queryFn: () => currentShift ? fetchShiftTransactions(currentShift.id, currentShift.storeId) : Promise.resolve([]),
    enabled: !!currentShift?.id
  });

  const { data: inventoryTransactions = [], isLoading: inventoryLoading } = useQuery({
    queryKey: ['shift-inventory-transactions', currentShift?.id],
    queryFn: () => currentShift ? fetchShiftInventoryTransactions(currentShift.id, currentShift.storeId) : Promise.resolve([]),
    enabled: !!currentShift?.id
  });

  const isLoading = transactionsLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalItems = inventoryTransactions.reduce((sum, t) => sum + Math.abs(t.quantity), 0);

  return (
    <div className="space-y-4">
      {/* Orders Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shift Orders Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{transactions.length}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalSales)}</p>
              <p className="text-sm text-muted-foreground">Total Sales</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{totalItems}</p>
              <p className="text-sm text-muted-foreground">Items Sold</p>
            </div>
          </div>

          {transactions.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Recent Transactions</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {transactions.slice(0, 10).map((transaction) => (
                    <div key={transaction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{transaction.receipt_number}</span>
                        {transaction.customer_name && (
                          <span className="text-muted-foreground">• {transaction.customer_name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {transaction.payment_method}
                        </Badge>
                        <span className="font-medium text-green-600">
                          {formatCurrency(transaction.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {transactions.length > 10 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      +{transactions.length - 10} more transactions
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Inventory Deductions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="w-5 h-5" />
            Inventory Deductions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {inventoryTransactions.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-red-50 rounded">
                  <p className="text-xl font-bold text-red-600">{inventoryTransactions.length}</p>
                  <p className="text-sm text-muted-foreground">Items Deducted</p>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded">
                  <p className="text-xl font-bold text-orange-600">{totalItems}</p>
                  <p className="text-sm text-muted-foreground">Total Quantity</p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <h4 className="font-medium text-sm text-muted-foreground mb-2">Inventory Changes</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {inventoryTransactions.map((invTransaction) => (
                  <div key={invTransaction.id} className="flex justify-between items-center p-2 bg-red-50 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4 text-red-500" />
                      <div>
                        <span className="font-medium">
                          Sale Transaction
                        </span>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(invTransaction.created_at), 'HH:mm')}
                          {invTransaction.notes && (
                            <span className="ml-2">• {invTransaction.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">
                        -{Math.abs(invTransaction.quantity)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {invTransaction.previous_quantity} → {invTransaction.new_quantity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No inventory deductions during this shift</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}