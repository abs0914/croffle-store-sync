
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity } from "lucide-react";

interface StockTransactionsTabProps {
  storeId: string;
}

export function StockTransactionsTab({ storeId }: StockTransactionsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Stock Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Transaction history coming in Phase 3</p>
        </div>
      </CardContent>
    </Card>
  );
}
