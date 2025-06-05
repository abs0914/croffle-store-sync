
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, TrendingDown, Package, FileText } from "lucide-react";
import { StockTransaction } from "@/types/inventoryManagement";
import { format } from "date-fns";

interface StockTransactionItemProps {
  transaction: StockTransaction;
}

export function StockTransactionItem({ transaction }: StockTransactionItemProps) {
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'adjustment':
        return <RefreshCw className="h-4 w-4" />;
      case 'transfer_in':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'transfer_out':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'stock_out':
        return <Package className="h-4 w-4 text-orange-600" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'adjustment':
        return 'bg-blue-100 text-blue-800';
      case 'transfer_in':
        return 'bg-green-100 text-green-800';
      case 'transfer_out':
        return 'bg-red-100 text-red-800';
      case 'stock_out':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {getTransactionIcon(transaction.transaction_type)}
          <div>
            <p className="font-medium">
              Inventory Item Transaction
            </p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(transaction.created_at), 'PPp')}
            </p>
          </div>
        </div>
        
        <Badge className={getTransactionColor(transaction.transaction_type)}>
          {transaction.transaction_type.replace('_', ' ').toUpperCase()}
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <span className="font-medium">Quantity Change: </span>
          <span className={transaction.quantity_change > 0 ? 'text-green-600' : 'text-red-600'}>
            {transaction.quantity_change > 0 ? '+' : ''}{transaction.quantity_change}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Stock: </span>
          {transaction.previous_stock} → {transaction.new_stock}
        </div>
        
        {transaction.reference_id && (
          <div>
            <span className="font-medium">Reference: </span>
            {transaction.reference_id}
          </div>
        )}
      </div>
      
      {transaction.notes && (
        <div className="text-sm">
          <span className="font-medium">Notes: </span>
          {transaction.notes}
        </div>
      )}
    </div>
  );
}
