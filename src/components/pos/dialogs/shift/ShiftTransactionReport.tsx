import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Shift } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/format";
import { ShoppingCart, Package2, TrendingDown, Receipt, Clock, Percent } from "lucide-react";
import { format } from "date-fns";
interface ShiftTransactionReportProps {
  currentShift: Shift | null;
}
interface Transaction {
  id: string;
  receipt_number: string;
  items: any;
  total: number;
  subtotal?: number;
  payment_method: string;
  created_at: string;
  customer_name?: string;
  discount_amount?: number;
  discount_type?: string;
  discount_id_number?: string;
  senior_citizen_discount?: number;
  pwd_discount?: number;
  discount?: number;
  discount_details?: any;
  senior_discounts?: any;
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
async function fetchShiftTransactions(shiftId: string, storeId: string): Promise<Transaction[]> {
  const {
    data: transactions,
    error
  } = await supabase.from('transactions').select(`
      id,
      receipt_number,
      items,
      total,
      subtotal,
      payment_method,
      created_at,
      discount_amount,
      discount_type,
      discount_id_number,
      senior_citizen_discount,
      pwd_discount,
      discount,
      discount_details,
      senior_discounts,
      customers(name)
    `).eq('shift_id', shiftId).eq('store_id', storeId).eq('status', 'completed').order('created_at', {
    ascending: false
  });
  if (error) throw error;
  return transactions?.map(t => ({
    ...t,
    customer_name: (t as any).customers?.name
  })) as Transaction[] || [];
}
async function fetchShiftInventoryTransactions(shiftId: string, storeId: string) {
  // Get transactions from this shift and their related inventory movements
  const {
    data: shiftTransactions,
    error: shiftError
  } = await supabase.from('transactions').select('id, receipt_number, created_at').eq('shift_id', shiftId).eq('store_id', storeId).eq('status', 'completed');
  if (shiftError) throw shiftError;
  if (!shiftTransactions || shiftTransactions.length === 0) {
    return [];
  }
  const transactionIds = shiftTransactions.map(t => t.id);
  const {
    data: inventoryTransactions,
    error
  } = await supabase.from('inventory_transactions').select(`
      id,
      transaction_type,
      quantity,
      previous_quantity,
      new_quantity,
      notes,
      created_at,
      reference_id
    `).eq('store_id', storeId).eq('transaction_type', 'sale').in('reference_id', transactionIds).order('created_at', {
    ascending: false
  });
  if (error) throw error;
  return inventoryTransactions || [];
}
export default function ShiftTransactionReport({
  currentShift
}: ShiftTransactionReportProps) {
  const {
    data: transactions = [],
    isLoading: transactionsLoading
  } = useQuery({
    queryKey: ['shift-transactions', currentShift?.id],
    queryFn: () => currentShift ? fetchShiftTransactions(currentShift.id, currentShift.storeId) : Promise.resolve([]),
    enabled: !!currentShift?.id
  });
  const {
    data: inventoryTransactions = [],
    isLoading: inventoryLoading
  } = useQuery({
    queryKey: ['shift-inventory-transactions', currentShift?.id],
    queryFn: () => currentShift ? fetchShiftInventoryTransactions(currentShift.id, currentShift.storeId) : Promise.resolve([]),
    enabled: !!currentShift?.id
  });
  const isLoading = transactionsLoading || inventoryLoading;
  if (isLoading) {
    return <div className="space-y-4">
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
      </div>;
  }
  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalItems = inventoryTransactions.reduce((sum, t) => sum + Math.abs(t.quantity), 0);
  
  // Calculate actual discounts from subtotal vs total difference
  const totalDiscounts = transactions.reduce((sum, t) => {
    const subtotal = t.subtotal || t.total;
    const actualDiscount = subtotal - t.total;
    return sum + Math.max(0, actualDiscount);
  }, 0);
  
  const totalSubtotal = transactions.reduce((sum, t) => sum + (t.subtotal || t.total), 0);
  
  // Calculate discount breakdown by type
  const seniorDiscounts = transactions.reduce((sum, t) => {
    if (t.discount_type === 'senior') {
      const subtotal = t.subtotal || t.total;
      return sum + Math.max(0, subtotal - t.total);
    }
    return sum + (t.senior_citizen_discount || 0);
  }, 0);
  
  const pwdDiscounts = transactions.reduce((sum, t) => {
    if (t.discount_type === 'pwd') {
      const subtotal = t.subtotal || t.total;
      return sum + Math.max(0, subtotal - t.total);
    }
    return sum + (t.pwd_discount || 0);
  }, 0);
  
  const otherDiscounts = totalDiscounts - seniorDiscounts - pwdDiscounts;
  
  const discountedTransactions = transactions.filter(t => {
    const subtotal = t.subtotal || t.total;
    return subtotal > t.total;
  });
  return <div className="space-y-4">
      {/* Orders Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Shift Orders Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
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
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalDiscounts)}</p>
              <p className="text-sm text-muted-foreground">Total Discounts</p>
            </div>
          </div>

          {/* Discount Breakdown */}
          {totalDiscounts > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Discount Breakdown ({discountedTransactions.length} transactions)
                </h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {seniorDiscounts > 0 && (
                    <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                      <span>Senior Citizen</span>
                      <span className="font-medium text-blue-600">{formatCurrency(seniorDiscounts)}</span>
                    </div>
                  )}
                  {pwdDiscounts > 0 && (
                    <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span>PWD</span>
                      <span className="font-medium text-green-600">{formatCurrency(pwdDiscounts)}</span>
                    </div>
                  )}
                  {otherDiscounts > 0 && (
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span>Other Discounts</span>
                      <span className="font-medium text-gray-600">{formatCurrency(otherDiscounts)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {transactions.length > 0 && <>
              <Separator className="my-4" />
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground mb-2">Recent Transactions</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {transactions.slice(0, 10).map(transaction => <div key={transaction.id} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-gray-400" />
                        <span className="font-medium">{transaction.receipt_number}</span>
                        {transaction.customer_name && <span className="text-muted-foreground">• {transaction.customer_name}</span>}
                        {(() => {
                          const subtotal = transaction.subtotal || transaction.total;
                          const hasDiscount = subtotal > transaction.total;
                          return hasDiscount && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                              <Percent className="w-3 h-3 mr-1" />
                              {transaction.discount_type || 'discount'}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {transaction.payment_method}
                        </Badge>
                        {(() => {
                          const subtotal = transaction.subtotal || transaction.total;
                          const hasDiscount = subtotal > transaction.total;
                          
                          if (hasDiscount) {
                            return (
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground line-through">
                                  {formatCurrency(subtotal)}
                                </div>
                                <div className="font-medium text-green-600">
                                  {formatCurrency(transaction.total)}
                                </div>
                              </div>
                            );
                          } else {
                            return (
                              <span className="font-medium text-green-600">
                                {formatCurrency(transaction.total)}
                              </span>
                            );
                          }
                        })()}
                      </div>
                    </div>)}
                  {transactions.length > 10 && <p className="text-xs text-muted-foreground text-center py-2">
                      +{transactions.length - 10} more transactions
                    </p>}
                </div>
              </div>
            </>}
        </CardContent>
      </Card>

      {/* Inventory Deductions */}
      
    </div>;
}