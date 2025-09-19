
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Receipt, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";

interface RecentTransactionsProps {
  storeId: string;
}

interface Transaction {
  id: string;
  receipt_number: string;
  total: number;
  payment_method: string;
  created_at: string;
  status: string;
}

export default function RecentTransactions({ storeId }: RecentTransactionsProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!storeId) return;

      try {
        // Get today's date in Philippine timezone for filtering recent transactions
        const today = new Date().toLocaleDateString('en-CA', {
          timeZone: 'Asia/Manila'
        });
        
        const { data, error } = await supabase
          .from('transactions')
          .select('id, receipt_number, total, payment_method, created_at, status')
          .eq('store_id', storeId)
          .gte('created_at', `${today}T00:00:00+08:00`)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setTransactions(data || []);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [storeId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading transactions...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6">
            <Package className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground font-medium">Ready for today's sales!</p>
            <p className="text-sm text-muted-foreground">Transactions will appear here once processing begins</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">#{transaction.receipt_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(transaction.created_at), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(transaction.total)}</p>
                  <Badge variant="outline" className="text-xs">
                    {transaction.payment_method}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
