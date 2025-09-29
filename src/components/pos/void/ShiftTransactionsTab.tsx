import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Receipt, Clock, DollarSign, User, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";
import { getVoidableTransactions, voidTransaction, VoidTransactionData, VoidRequestData } from "@/services/transactions/voidTransactionService";
import { VoidTransactionDialog } from "./VoidTransactionDialog";
import { useAuth } from "@/contexts/auth";
import { toast } from "sonner";

interface ShiftTransactionsTabProps {
  shiftId: string;
  storeId: string;
}

export function ShiftTransactionsTab({ shiftId, storeId }: ShiftTransactionsTabProps) {
  const { user } = useAuth();
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [isVoidDialogOpen, setIsVoidDialogOpen] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);

  const { data: transactions = [], isLoading, refetch } = useQuery({
    queryKey: ['shift-transactions-voidable', shiftId, storeId],
    queryFn: () => getVoidableTransactions(storeId, { 
      startDate: new Date().toISOString().split('T')[0] + 'T00:00:00Z',
      endDate: new Date().toISOString().split('T')[0] + 'T23:59:59Z'
    }),
    enabled: !!shiftId && !!storeId,
    refetchInterval: 30000 // Refetch every 30 seconds
  });

  const handleVoidClick = (transaction: any) => {
    setSelectedTransaction(transaction);
    setIsVoidDialogOpen(true);
  };

  const handleConfirmVoid = async (data: VoidRequestData) => {
    if (!user?.id || !selectedTransaction) return;

    setIsVoiding(true);
    try {
      const result = await voidTransaction(data);

      if (result.success) {
        setIsVoidDialogOpen(false);
        setSelectedTransaction(null);
        refetch(); // Refresh the transactions list
      }
    } catch (error) {
      console.error('Void transaction error:', error);
    } finally {
      setIsVoiding(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today's Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Loading transactions...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Today's Transactions
            <Badge variant="secondary">{transactions.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found for this shift
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                    {/* Transaction Header */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4" />
                          <span className="font-medium">{transaction.receipt_number}</span>
                          <Badge variant={transaction.status === 'completed' ? 'default' : 'destructive'}>
                            {transaction.status}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(transaction.created_at), 'h:mm a')}
                        </div>
                      </div>

                      {transaction.status === 'completed' ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleVoidClick(transaction)}
                          className="flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          Void
                        </Button>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          VOIDED
                        </Badge>
                      )}
                    </div>

                    <Separator />

                    {/* Transaction Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-semibold">{formatCurrency(transaction.total)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Payment:</span>
                        <Badge variant="outline">
                          {transaction.payment_method.toUpperCase()}
                        </Badge>
                      </div>

                      {transaction.customers && (
                        <div className="flex items-center gap-2 col-span-2">
                          <User className="h-4 w-4" />
                          <span>{transaction.customers.name}</span>
                          {transaction.customers.phone && (
                            <span className="text-muted-foreground">({transaction.customers.phone})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Items Summary */}
                    <div className="bg-muted/50 p-2 rounded text-sm">
                      <div className="font-medium mb-1">Items:</div>
                      {JSON.parse(String(transaction.items)).map((item: any, index: number) => (
                        <div key={index} className="flex justify-between">
                          <span>{item.name} x{item.quantity}</span>
                          <span>{formatCurrency(item.totalPrice)}</span>
                        </div>
                      ))}
                    </div>

                    {transaction.discount > 0 && (
                      <div className="text-sm text-muted-foreground">
                        Discount: {formatCurrency(transaction.discount)} 
                        {transaction.discount_type && ` (${transaction.discount_type})`}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <VoidTransactionDialog
        isOpen={isVoidDialogOpen}
        onClose={() => {
          setIsVoidDialogOpen(false);
          setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
        onConfirmVoid={handleConfirmVoid}
        isVoiding={isVoiding}
      />
    </>
  );
}