
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProfitLossReport } from "@/types/reports";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from "date-fns";

interface ProfitLossReportViewProps {
  data: ProfitLossReport | null;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export function ProfitLossReportView({ data, dateRange }: ProfitLossReportViewProps) {
  if (!data) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center py-10">
            <p>No profit and loss data available for the selected period</p>
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
          <CardTitle className="text-lg">Profit & Loss Summary: {dateRangeText}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.totalRevenue.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Cost of Goods</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.costOfGoods.toFixed(2)}</h3>
            </div>
            <div className="bg-croffle-light/20 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Gross Profit</p>
              <h3 className="text-2xl font-bold text-croffle-primary">₱{data.grossProfit.toFixed(2)}</h3>
            </div>
            <div className={`p-4 rounded-lg ${data.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-sm text-muted-foreground">Net Profit</p>
              <h3 className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₱{data.netProfit.toFixed(2)}
              </h3>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profit Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data.profitByDate}
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
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="cost" name="Cost" stroke="#82ca9d" />
                <Line type="monotone" dataKey="profit" name="Profit" stroke="#ff7300" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Profitability</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Cost</TableHead>
                <TableHead className="text-right">Profit</TableHead>
                <TableHead className="text-right">Margin %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.productProfitability.map((product, index) => (
                <TableRow key={index}>
                  <TableCell>{product.name}</TableCell>
                  <TableCell className="text-right">₱{product.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₱{product.cost.toFixed(2)}</TableCell>
                  <TableCell className="text-right">₱{product.profit.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{product.margin.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
