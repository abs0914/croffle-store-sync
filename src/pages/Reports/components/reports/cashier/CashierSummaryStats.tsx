
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CashierReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";

interface CashierSummaryStatsProps {
  data: CashierReport;
}

export function CashierSummaryStats({ data }: CashierSummaryStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Cashiers
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{data.cashierCount}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Transactions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{data.totalTransactions}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average Transaction Value
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">{formatCurrency(data.averageTransactionValue)}</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Average Transaction Time
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-2xl font-bold">
            {data.averageTransactionTime.toFixed(1)} min
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
