
import { Card, CardContent } from "@/components/ui/card";
import { FileText, RefreshCw, TrendingUp, Package } from "lucide-react";

interface StockTransactionsSummaryProps {
  summary: {
    totalTransactions: number;
    adjustments: number;
    transfers: number;
    stockOuts: number;
  };
}

export function StockTransactionsSummary({ summary }: StockTransactionsSummaryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <p className="text-2xl font-bold">{summary.totalTransactions}</p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Adjustments</p>
              <p className="text-2xl font-bold">{summary.adjustments}</p>
            </div>
            <RefreshCw className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Transfers</p>
              <p className="text-2xl font-bold">{summary.transfers}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Stock Outs</p>
              <p className="text-2xl font-bold">{summary.stockOuts}</p>
            </div>
            <Package className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
