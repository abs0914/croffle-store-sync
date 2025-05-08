
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesReport } from "@/types/reports";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

interface SalesReportViewProps {
  data: SalesReport | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function SalesReportView({ data, dateRange }: SalesReportViewProps) {
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

  const dateRangeText = dateRange.from && dateRange.to
    ? `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
    : 'Custom Range';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Sales Overview: {dateRangeText}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Sales</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.totalSales.toFixed(2)}</h3>
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
    </div>
  );
}
