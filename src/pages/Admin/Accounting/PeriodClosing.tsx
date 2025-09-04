import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Calendar, Lock, Unlock, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate } from "@/utils/format";
import { toast } from "sonner";

interface FiscalPeriod {
  id: string;
  period_year: number;
  period_month: number;
  period_name: string;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  closed_by?: string;
  closed_at?: string;
}

export function PeriodClosing() {
  const [periods] = useState<FiscalPeriod[]>([
    {
      id: "1",
      period_year: 2025,
      period_month: 1,
      period_name: "January 2025",
      start_date: "2025-01-01",
      end_date: "2025-01-31",
      is_closed: false
    },
    {
      id: "2", 
      period_year: 2024,
      period_month: 12,
      period_name: "December 2024",
      start_date: "2024-12-01",
      end_date: "2024-12-31",
      is_closed: true,
      closed_by: "John Doe",
      closed_at: "2025-01-02T10:30:00Z"
    },
    {
      id: "3",
      period_year: 2024,
      period_month: 11,
      period_name: "November 2024", 
      start_date: "2024-11-01",
      end_date: "2024-11-30",
      is_closed: true,
      closed_by: "John Doe",
      closed_at: "2024-12-02T14:15:00Z"
    }
  ]);

  const handleClosePeriod = (periodId: string) => {
    toast.success("Period closed successfully");
    // In real implementation, this would call the API
  };

  const handleReopenPeriod = (periodId: string) => {
    toast.success("Period reopened successfully");
    // In real implementation, this would call the API
  };

  const openPeriods = periods.filter(p => !p.is_closed);
  const closedPeriods = periods.filter(p => p.is_closed);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/accounting">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Accounting
              </Link>
            </Button>
          </div>
          <h1 className="text-3xl font-bold text-croffle-text">Period Closing</h1>
          <p className="text-croffle-text/70">
            Manage fiscal periods and perform month-end closing procedures
          </p>
        </div>
      </div>

      {/* Period Status Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Open Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">{openPeriods.length}</div>
            <p className="text-xs text-croffle-text/70">Require closing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Closed Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">{closedPeriods.length}</div>
            <p className="text-xs text-croffle-text/70">This year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Current Period</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-croffle-text">Jan 2025</div>
            <p className="text-xs text-croffle-text/70">
              <Badge variant="secondary" className="text-xs">
                Open
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Open Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-croffle-accent" />
            Open Periods
          </CardTitle>
          <CardDescription>
            Periods that are currently open and available for transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {openPeriods.map((period) => (
              <div key={period.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-croffle-text">{period.period_name}</h3>
                    <p className="text-sm text-croffle-text/70">
                      {formatDate(period.start_date)} - {formatDate(period.end_date)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Unlock className="h-3 w-3 mr-1" />
                    Open
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Lock className="h-4 w-4 mr-1" />
                        Close Period
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Close Period: {period.period_name}</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Are you sure you want to close this accounting period?</p>
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-yellow-800">Important:</p>
                                <p className="text-yellow-700">Once closed, no new transactions can be posted to this period. This action should only be performed after completing all month-end procedures.</p>
                              </div>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleClosePeriod(period.id)}>
                          Close Period
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Closed Periods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-croffle-accent" />
            Closed Periods
          </CardTitle>
          <CardDescription>
            Previously closed periods with restricted access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {closedPeriods.map((period) => (
              <div key={period.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-croffle-text">{period.period_name}</h3>
                    <p className="text-sm text-croffle-text/70">
                      {formatDate(period.start_date)} - {formatDate(period.end_date)}
                    </p>
                    {period.closed_at && (
                      <p className="text-xs text-croffle-text/60">
                        Closed on {formatDate(period.closed_at)} by {period.closed_by}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-green-200 text-green-700">
                    <Lock className="h-3 w-3 mr-1" />
                    Closed
                  </Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Unlock className="h-4 w-4 mr-1" />
                        Reopen
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reopen Period: {period.period_name}</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to reopen this closed accounting period? This will allow new transactions to be posted again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleReopenPeriod(period.id)}>
                          Reopen Period
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}