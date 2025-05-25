import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CashierReport } from "@/types/reports";
import { formatCurrency } from "@/utils/format";
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";

interface CashierCashTrackingCardProps {
  data: CashierReport;
}

export function CashierCashTrackingCard({ data }: CashierCashTrackingCardProps) {
  // Calculate cash tracking statistics from attendance data
  const cashStats = data.attendance?.reduce((stats, record) => {
    stats.totalStartingCash += record.startingCash;
    if (record.endingCash !== null) {
      stats.totalEndingCash += record.endingCash;
      stats.completedShifts += 1;
      stats.totalCashVariance += (record.endingCash - record.startingCash);
    } else {
      stats.activeShifts += 1;
    }
    stats.totalShifts += 1;
    return stats;
  }, {
    totalStartingCash: 0,
    totalEndingCash: 0,
    totalCashVariance: 0,
    completedShifts: 0,
    activeShifts: 0,
    totalShifts: 0
  }) || {
    totalStartingCash: 0,
    totalEndingCash: 0,
    totalCashVariance: 0,
    completedShifts: 0,
    activeShifts: 0,
    totalShifts: 0
  };

  const averageStartingCash = cashStats.totalShifts > 0 ? cashStats.totalStartingCash / cashStats.totalShifts : 0;
  const averageEndingCash = cashStats.completedShifts > 0 ? cashStats.totalEndingCash / cashStats.completedShifts : 0;
  const averageCashVariance = cashStats.completedShifts > 0 ? cashStats.totalCashVariance / cashStats.completedShifts : 0;

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="h-5 w-5 text-green-600" />
          Cash Drawer Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Starting Cash */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Starting Cash</span>
              <Badge variant="outline" className="text-xs">
                {cashStats.totalShifts} shifts
              </Badge>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cashStats.totalStartingCash)}
            </div>
            <div className="text-xs text-muted-foreground">
              Avg: {formatCurrency(averageStartingCash)}
            </div>
          </div>

          {/* Total Ending Cash */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Total Ending Cash</span>
              <Badge variant="outline" className="text-xs">
                {cashStats.completedShifts} completed
              </Badge>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(cashStats.totalEndingCash)}
            </div>
            <div className="text-xs text-muted-foreground">
              Avg: {formatCurrency(averageEndingCash)}
            </div>
          </div>

          {/* Cash Variance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Cash Variance</span>
              {averageCashVariance !== 0 && (
                <div className="flex items-center gap-1">
                  {averageCashVariance > 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <div className={`text-2xl font-bold ${
              cashStats.totalCashVariance > 0 ? 'text-green-600' : 
              cashStats.totalCashVariance < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {cashStats.totalCashVariance >= 0 ? '+' : ''}{formatCurrency(cashStats.totalCashVariance)}
            </div>
            <div className="text-xs text-muted-foreground">
              Avg: {averageCashVariance >= 0 ? '+' : ''}{formatCurrency(averageCashVariance)}
            </div>
          </div>

          {/* Shift Status */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Shift Status</span>
              {cashStats.activeShifts > 0 && (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Completed:</span>
                <span className="font-medium">{cashStats.completedShifts}</span>
              </div>
              {cashStats.activeShifts > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-600">Active:</span>
                  <span className="font-medium">{cashStats.activeShifts}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cash Variance Analysis */}
        {cashStats.completedShifts > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="text-sm font-medium text-muted-foreground mb-2">Cash Variance Analysis</div>
            <div className="text-xs text-muted-foreground">
              {Math.abs(averageCashVariance) < 1 ? (
                <span className="text-green-600">✓ Cash management is within acceptable variance</span>
              ) : averageCashVariance > 0 ? (
                <span className="text-amber-600">⚠ Consistent cash overage detected - review cash handling procedures</span>
              ) : (
                <span className="text-red-600">⚠ Cash shortage detected - investigate discrepancies</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
