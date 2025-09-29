import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TransactionDetailsTable } from "../TransactionDetailsTable";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { fetchTransactionsWithFallback } from "@/services/reports/utils/transactionQueryUtils";

interface SalesReportViewProps {
  data: SalesReport | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  isAllStores?: boolean;
  storeId: string;
}

export function SalesReportView({ data, dateRange, isAllStores, storeId }: SalesReportViewProps) {
  // Fetch detailed transactions for the table using the same robust utility
  const { data: transactions, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', storeId, dateRange.from, dateRange.to],
    queryFn: async () => {
      if (!dateRange.from || !dateRange.to) return [];
      
      // Use Philippine timezone for proper date filtering
      const PHILIPPINES_TZ = 'Asia/Manila';
      const fromStr = formatInTimeZone(dateRange.from, PHILIPPINES_TZ, 'yyyy-MM-dd');
      const toStr = formatInTimeZone(dateRange.to, PHILIPPINES_TZ, 'yyyy-MM-dd');
      
      console.log('Sales Report: Fetching transaction details with Philippine timezone');
      console.log(`Date range: ${fromStr} to ${toStr} (Philippine time)`);
      
      // Use the same robust transaction query as the X-Reading and main sales report
      const queryResult = await fetchTransactionsWithFallback({
        storeId: storeId === 'all' ? undefined : storeId,
        from: fromStr,
        to: toStr,
        status: "completed",
        orderBy: "created_at",
        ascending: false,
        includeCashierInfo: true
      });

      const { data, error } = queryResult;
      if (error) throw error;

      console.log(`Sales Report: Found ${data?.length || 0} transaction details`);

      return data?.map(tx => ({
        ...tx,
        customer_name: 'Walk-in' // Default customer name
      })) || [];
    },
    enabled: !!dateRange.from && !!dateRange.to,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: Infinity, // Data never becomes stale
    gcTime: 10 * 60 * 1000 // Keep data in cache for 10 minutes
  });

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No sales data available for the selected period</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const PHILIPPINES_TZ = 'Asia/Manila';
  const dateRangeText = dateRange.from && dateRange.to
    ? `${formatInTimeZone(dateRange.from, PHILIPPINES_TZ, 'MMM dd, yyyy')} - ${formatInTimeZone(dateRange.to, PHILIPPINES_TZ, 'MMM dd, yyyy')}`
    : 'Custom Range';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">
            Sales Overview: {isAllStores ? "All Stores - " : ""}{dateRangeText}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{formatCurrency(data.totalSales)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Transactions</p>
              <h3 className="text-2xl font-bold text-croffle-primary">{data.totalTransactions}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Average Sale</p>
              <h3 className="text-2xl font-bold text-croffle-primary">
                ₱{data.totalTransactions > 0 ? (data.totalSales / data.totalTransactions).toFixed(2) : '0.00'}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.salesByDate}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => `₱${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="amount" name="Sales Amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Quantity Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topProducts.map((product, index) => (
                <TableRow key={index}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell>{product.quantity}</TableCell>
                  <TableCell className="text-right">₱{product.revenue.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Method Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.paymentMethods.map((method, index) => (
              <div key={index} className="bg-croffle-light/10 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">{method.method}</p>
                <h3 className="text-xl font-bold text-croffle-primary">₱{method.amount.toFixed(2)}</h3>
                <p className="text-xs text-muted-foreground">{method.percentage.toFixed(1)}% of sales</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details Table */}
      {transactions && transactions.length > 0 && (
        <TransactionDetailsTable 
          transactions={transactions} 
          onTransactionVoided={refetchTransactions}
        />
      )}
    </div>
  );
}