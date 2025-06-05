
import { FileText } from "lucide-react";
import { StockTransaction } from "@/types/inventoryManagement";
import { StockTransactionItem } from "./StockTransactionItem";

interface StockTransactionsContentProps {
  loading: boolean;
  transactions: StockTransaction[];
  hasFilters: boolean;
}

export function StockTransactionsContent({ loading, transactions, hasFilters }: StockTransactionsContentProps) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {hasFilters
            ? 'No transactions found matching your filters'
            : 'No stock transactions recorded yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {transactions.map((transaction) => (
        <StockTransactionItem key={transaction.id} transaction={transaction} />
      ))}
    </div>
  );
}
