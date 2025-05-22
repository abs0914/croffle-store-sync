
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CashierReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";

interface CashierPerformanceTabProps {
  data: CashierReport;
}

export function CashierPerformanceTab({ data }: CashierPerformanceTabProps) {
  return (
    <div className="space-y-6">
      {data.cashiers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cashier Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Avg. Transaction</TableHead>
                  <TableHead className="text-right">Avg. Time (min)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cashiers.map((cashier, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={cashier.avatar} alt={cashier.name} />
                          <AvatarFallback>{cashier.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{cashier.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(cashier.totalSales)}</TableCell>
                    <TableCell className="text-right">{cashier.transactionCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(cashier.averageTransactionValue)}</TableCell>
                    <TableCell className="text-right">{cashier.averageTransactionTime.toFixed(1)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <CardContent>
            <p>No cashier data available</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
