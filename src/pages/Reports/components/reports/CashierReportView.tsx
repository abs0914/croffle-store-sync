
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchCashierReport } from "@/services/reports";
import { format } from "date-fns";

interface CashierReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function CashierReportView({ storeId, dateRange }: CashierReportViewProps) {
  const from = dateRange.from?.toISOString().split('T')[0];
  const to = dateRange.to?.toISOString().split('T')[0];
  
  const { data, isLoading } = useQuery({
    queryKey: ['cashier-report', storeId, from, to],
    queryFn: () => from && to ? fetchCashierReport(storeId, from, to) : Promise.resolve(null),
    enabled: !!storeId && !!from && !!to
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 flex justify-center">
          <Spinner className="h-8 w-8 text-croffle-accent" />
        </CardContent>
      </Card>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No cashier performance data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const dateRangeText = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
    : 'Custom Range';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cashier Performance: {dateRangeText}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Cashiers</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.cashierCount}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Transactions</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.totalTransactions}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg. Transaction</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.averageTransactionValue.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Avg. Speed</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.averageTransactionTime} min</h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance by Cashier</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.cashiers.map(cashier => ({
                  name: cashier.name,
                  sales: cashier.totalSales,
                  transactions: cashier.transactionCount,
                }))}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="sales" name="Sales (₱)" fill="#8884d8" />
                <Bar yAxisId="right" dataKey="transactions" name="Transactions" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Avg. Sale</TableHead>
                  <TableHead className="text-right">Avg. Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cashiers.map((cashier, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={cashier.avatar} />
                          <AvatarFallback>{cashier.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{cashier.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{cashier.transactionCount}</TableCell>
                    <TableCell className="text-right">₱{cashier.totalSales.toFixed(2)}</TableCell>
                    <TableCell className="text-right">₱{cashier.averageTransactionValue.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{cashier.averageTransactionTime} min</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cashier Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Shift Start</TableHead>
                  <TableHead>Shift End</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.cashiers.map((cashier, index) => {
                  // Simulate shift data (this would come from the actual data in a real implementation)
                  const shiftStart = new Date(dateRange.from || new Date());
                  shiftStart.setHours(8 + index % 3, 0, 0);
                  
                  const shiftEnd = new Date(shiftStart);
                  shiftEnd.setHours(shiftStart.getHours() + 8);
                  
                  const durationHours = 8;
                  
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={cashier.avatar} />
                            <AvatarFallback>{cashier.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span>{cashier.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{format(shiftStart, 'hh:mm a')}</TableCell>
                      <TableCell>{format(shiftEnd, 'hh:mm a')}</TableCell>
                      <TableCell>{durationHours} hours</TableCell>
                      <TableCell className="text-right">₱{cashier.totalSales.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{cashier.transactionCount}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
