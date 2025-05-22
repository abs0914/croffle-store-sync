
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { CashierReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";
import { useIsMobile } from "@/hooks/use-mobile";

interface CashierHourlyTabProps {
  data: CashierReport;
}

export function CashierHourlyTab({ data }: CashierHourlyTabProps) {
  const isMobile = useIsMobile();
  
  // Format the hours for better display
  const formattedHourlyData = data.hourlyData.map(h => ({
    ...h,
    hour: h.hour.substring(0, 5) // Remove seconds from time
  }));
  
  return (
    <div className="space-y-6">
      {formattedHourlyData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Transactions by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`w-full ${isMobile ? 'h-[200px]' : 'h-[300px]'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={formattedHourlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="transactions" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <CardContent>
            <p>No hourly data available for this period</p>
          </CardContent>
        </Card>
      )}
      
      {formattedHourlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Hourly Data</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hour</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Avg. Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formattedHourlyData.map((hour, index) => (
                  <TableRow key={index}>
                    <TableCell>{hour.hour}</TableCell>
                    <TableCell className="text-right">{formatCurrency(hour.sales)}</TableCell>
                    <TableCell className="text-right">{hour.transactions}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(hour.transactions > 0 ? hour.sales / hour.transactions : 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
