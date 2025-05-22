
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AreaChart, Tooltip, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CashierReport } from "@/types/reports";
import { useIsMobile } from "@/hooks/use-mobile";
import { formatCurrency } from "@/utils/format";
import { Info, Image } from "lucide-react";
import { format } from "date-fns";

interface CashierReportViewProps {
  storeId: string;
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  data: CashierReport;
}

export function CashierReportView({ data }: CashierReportViewProps) {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Determine if we're looking at sample data
  const isSampleData = !data.cashiers.some(c => c.transactionCount > 0);

  // Format the hours for better display
  const formattedHourlyData = data.hourlyData.map(h => ({
    ...h,
    hour: h.hour.substring(0, 5) // Remove seconds from time
  }));
  
  // Get top cashiers for leaderboard
  const topCashiers = [...data.cashiers]
    .sort((a, b) => b.totalSales - a.totalSales)
    .slice(0, 5);

  // Format date and time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "Not recorded";
    try {
      return format(new Date(dateString), "MMM dd, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  return (
    <div className="space-y-6">
      {isSampleData && (
        <Alert variant="default" className="bg-amber-50 text-amber-800 border-amber-200">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Showing sample data. Connect to your database and complete transactions to see actual cashier performance.
          </AlertDescription>
        </Alert>
      )}

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full mb-4 flex flex-wrap">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="hourly" className="flex-1">Hourly Analysis</TabsTrigger>
          <TabsTrigger value="cashiers" className="flex-1">Cashiers</TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1">Attendance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
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
        </TabsContent>
        
        <TabsContent value="hourly" className="space-y-6">
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
        </TabsContent>
        
        <TabsContent value="cashiers" className="space-y-6">
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
        </TabsContent>
        
        <TabsContent value="attendance" className="space-y-6">
          {data.attendance && data.attendance.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Cashier Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Start Shift</TableHead>
                        <TableHead>Start Image</TableHead>
                        <TableHead>End Shift</TableHead>
                        <TableHead>End Image</TableHead>
                        <TableHead className="text-right">Starting Cash</TableHead>
                        <TableHead className="text-right">Ending Cash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.attendance.map((record, index) => (
                        <TableRow key={index}>
                          <TableCell>{record.name}</TableCell>
                          <TableCell>{formatDateTime(record.startTime)}</TableCell>
                          <TableCell>
                            {record.startPhoto ? (
                              <div className="relative h-12 w-16 overflow-hidden rounded-md border">
                                <img 
                                  src={record.startPhoto} 
                                  alt="Start shift" 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-16 items-center justify-center rounded-md border bg-muted">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{formatDateTime(record.endTime)}</TableCell>
                          <TableCell>
                            {record.endPhoto ? (
                              <div className="relative h-12 w-16 overflow-hidden rounded-md border">
                                <img 
                                  src={record.endPhoto} 
                                  alt="End shift" 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Ccircle cx='8.5' cy='8.5' r='1.5'%3E%3C/circle%3E%3Cpolyline points='21 15 16 10 5 21'%3E%3C/polyline%3E%3C/svg%3E";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="flex h-12 w-16 items-center justify-center rounded-md border bg-muted">
                                <Image className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(record.startingCash)}</TableCell>
                          <TableCell className="text-right">
                            {record.endingCash !== null ? formatCurrency(record.endingCash) : "Not recorded"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="p-6 text-center">
              <CardContent>
                <p>No attendance data available for this period</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
