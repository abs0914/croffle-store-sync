import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Camera, Clock, DollarSign, TrendingUp, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { fetchCashierShiftReport, CashierDailyReport } from "@/services/reports/cashierShiftReportService";
import { formatCurrency } from "@/utils/format";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface CashierShiftReportViewProps {
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
}

export default function CashierShiftReportView({ dateRange: propDateRange }: CashierShiftReportViewProps) {
  const { user } = useAuth();
  const { currentStore } = useStore();
  
  // Use the dateRange from props if available, otherwise default to yesterday
  const getInitialDate = () => {
    if (propDateRange?.from) {
      return propDateRange.from;
    }
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  };
  
  const [selectedDate, setSelectedDate] = useState<Date>(getInitialDate);

  // Update selectedDate when propDateRange changes
  useEffect(() => {
    if (propDateRange?.from) {
      setSelectedDate(propDateRange.from);
    }
  }, [propDateRange?.from]);

  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ["cashier-shift-report", user?.id, currentStore?.id, selectedDate],
    queryFn: () => {
      if (!user?.id || !currentStore?.id) return null;
      return fetchCashierShiftReport(user.id, currentStore.id, selectedDate);
    },
    enabled: !!user?.id && !!currentStore?.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load shift report. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!reportData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Shift Data Found</h3>
          <p className="text-muted-foreground">
            No shift was found for {format(selectedDate, "MMMM dd, yyyy")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { shift, sales, cashVariance, previousShiftEndingCash } = reportData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">My Daily Shift Report</h2>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full sm:w-[240px] justify-start text-left font-normal">
              <CalendarIcon className="mr-2 h-4 w-4" />
              {format(selectedDate, "PPP")}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(sales.totalSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Transactions</p>
                <p className="text-2xl font-bold">{sales.totalTransactions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Avg Transaction</p>
                <p className="text-2xl font-bold">{formatCurrency(sales.averageTransactionValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className={`h-8 w-8 ${cashVariance >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">Cash Variance</p>
                <p className={`text-2xl font-bold ${cashVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {cashVariance >= 0 ? '+' : ''}{formatCurrency(cashVariance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shift Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Shift Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span className="font-medium">Status:</span>
              <Badge variant={shift.status === 'active' ? 'default' : 'secondary'}>
                {shift.status === 'active' ? 'Active' : 'Closed'}
              </Badge>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Start Time:</span>
              <span>{format(new Date(shift.startTime), "h:mm a")}</span>
            </div>
            
            {shift.endTime && (
              <div className="flex justify-between">
                <span className="font-medium">End Time:</span>
                <span>{format(new Date(shift.endTime), "h:mm a")}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="font-medium">Starting Cash:</span>
              <span>{formatCurrency(shift.startingCash)}</span>
            </div>

            {shift.endingCash !== null && (
              <div className="flex justify-between">
                <span className="font-medium">Ending Cash:</span>
                <span>{formatCurrency(shift.endingCash)}</span>
              </div>
            )}

            {previousShiftEndingCash !== null && (
              <div className="flex justify-between">
                <span className="font-medium">Previous Shift End:</span>
                <span>{formatCurrency(previousShiftEndingCash)}</span>
              </div>
            )}

            {shift.cashierName && (
              <div className="flex justify-between">
                <span className="font-medium">Cashier:</span>
                <span>{shift.cashierName}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Sales Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="font-medium">Cash Sales:</span>
              <span>{formatCurrency(sales.cashSales)}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="font-medium">Card Sales:</span>
              <span>{formatCurrency(sales.cardSales)}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium">GCash Sales:</span>
              <span>{formatCurrency(sales.gcashSales)}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium">Discounts:</span>
              <span className="text-red-600">-{formatCurrency(sales.discountAmount)}</span>
            </div>

            <div className="flex justify-between">
              <span className="font-medium">Refunds:</span>
              <span className="text-red-600">-{formatCurrency(sales.refundAmount)}</span>
            </div>
            
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Total Sales:</span>
              <span className="font-bold">{formatCurrency(sales.totalSales)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Drawer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Cash Drawer Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Starting Cash:</span>
                <span>{formatCurrency(shift.startingCash)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="font-medium">Cash Sales:</span>
                <span>{formatCurrency(sales.cashSales)}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Paid In:</span>
                <span className="text-green-600">+{formatCurrency(sales.paidInAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span className="font-medium">Paid Out:</span>
                <span className="text-red-600">-{formatCurrency(sales.paidOutAmount)}</span>
              </div>

              <div className="flex justify-between border-t pt-2">
                <span className="font-medium">Expected Cash:</span>
                <span className="font-bold">{formatCurrency(shift.startingCash + sales.cashSales + sales.paidInAmount - sales.paidOutAmount)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {shift.endingCash !== null && (
                <>
                  <div className="flex justify-between">
                    <span className="font-medium">Actual Cash:</span>
                    <span>{formatCurrency(shift.endingCash)}</span>
                  </div>

                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Cash Variance:</span>
                    <span className={`font-bold ${cashVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {cashVariance >= 0 ? '+' : ''}{formatCurrency(cashVariance)}
                    </span>
                  </div>
                </>
              )}

              {previousShiftEndingCash !== null && (
                <div className="flex justify-between">
                  <span className="font-medium">Previous Shift End:</span>
                  <span>{formatCurrency(previousShiftEndingCash)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Hourly Sales Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-2">
            {sales.hourlyBreakdown.map((hour) => (
              <div key={hour.hour} className="text-center">
                <div 
                  className="bg-primary/20 rounded-t"
                  style={{ 
                    height: `${Math.max(4, (hour.sales / Math.max(...sales.hourlyBreakdown.map(h => h.sales))) * 80)}px` 
                  }}
                />
                <div className="text-xs mt-1 text-muted-foreground">
                  {hour.hour.split(':')[0]}h
                </div>
                <div className="text-xs font-medium">
                  {formatCurrency(hour.sales)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shift Photos */}
      {(shift.startPhoto || shift.endPhoto) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Camera className="h-5 w-5 mr-2" />
              Shift Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shift.startPhoto && (
                <div>
                  <p className="font-medium mb-2">Start of Shift</p>
                  <img 
                    src={shift.startPhoto} 
                    alt="Start of shift" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
              
              {shift.endPhoto && (
                <div>
                  <p className="font-medium mb-2">End of Shift</p>
                  <img 
                    src={shift.endPhoto} 
                    alt="End of shift" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}