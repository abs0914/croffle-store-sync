
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { CashierReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";
import { useIsMobile } from "@/hooks/use-mobile";

interface CashierOverviewTabProps {
  data: CashierReport;
}

export function CashierOverviewTab({ data }: CashierOverviewTabProps) {
  const isMobile = useIsMobile();
  
  // Get top cashiers for leaderboard
  const topCashiers = [...data.cashiers]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);
    
  // Format the hours for better display
  const formattedHourlyData = data.hourlyData.map(h => ({
    ...h,
    hour: h.hour.substring(0, 5) // Remove seconds from time
  }));
  
  return (
    <div className="space-y-6">
      {topCashiers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Cashiers</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Rank</TableHead>
                  <TableHead>Cashier</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCashiers.map((cashier, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <CardContent>
            <p>No cashier performance data available for this period</p>
          </CardContent>
        </Card>
      )}

      {formattedHourlyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales by Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`w-full ${isMobile ? 'h-[200px]' : 'h-[300px]'}`}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={formattedHourlyData}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="sales" 
                    stroke="#8884d8" 
                    fillOpacity={1} 
                    fill="url(#colorSales)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
