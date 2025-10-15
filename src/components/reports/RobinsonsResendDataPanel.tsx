import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Send, CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface RobinsonsResendDataPanelProps {
  storeId: string;
}

interface TransmissionLog {
  id: string;
  transmission_date: string;
  status: 'success' | 'failed' | 'pending';
  file_name: string;
  record_count: number;
  error_message?: string;
}

export function RobinsonsResendDataPanel({ storeId }: RobinsonsResendDataPanelProps) {
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const queryClient = useQueryClient();

  // Fetch transmission history
  // TODO: Create sm_accreditation_export_log table to track transmission history
  // For now, use placeholder data
  const { data: transmissionHistory, isLoading: historyLoading } = useQuery({
    queryKey: ['robinsons-transmission-history', storeId],
    queryFn: async () => {
      // Placeholder: Once sm_accreditation_export_log table is created, query it
      // For now, return empty array
      console.log('📊 Robinsons: Fetching transmission history (placeholder)');
      return [] as TransmissionLog[];
    },
    enabled: !!storeId
  });

  // Re-send data mutation
  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!dateRange.from || !dateRange.to) {
        throw new Error('Please select a date range');
      }

      console.log('🔄 Robinsons Re-send: Initiating data re-transmission', {
        storeId: storeId.slice(0, 8),
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd')
      });

      // Call the SM accreditation export service
      const { data, error } = await supabase.functions.invoke('sm-accreditation-export', {
        body: {
          storeId,
          startDate: format(dateRange.from, 'yyyy-MM-dd'),
          endDate: format(dateRange.to, 'yyyy-MM-dd'),
          isManualResend: true
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Data re-sent successfully to Robinsons', {
        description: `Transmitted data from ${format(dateRange.from!, 'MMM dd')} to ${format(dateRange.to!, 'MMM dd, yyyy')}`
      });
      queryClient.invalidateQueries({ queryKey: ['robinsons-transmission-history', storeId] });
      setDateRange({ from: undefined, to: undefined });
      setShowConfirmDialog(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to re-send data', {
        description: error.message
      });
    }
  });

  const handleResendClick = () => {
    if (!dateRange.from || !dateRange.to) {
      toast.error('Please select a date range');
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmResend = () => {
    resendMutation.mutate();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      failed: "destructive",
      pending: "secondary"
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Re-send Data Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Re-send Data to Robinsons (RLC)
          </CardTitle>
          <CardDescription>
            Manually re-transmit transaction data for specific date ranges. Required for Robinsons accreditation compliance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Robinsons Requirement #9</AlertTitle>
            <AlertDescription>
              System must provide facility to re-send data for specified date range in case of transmission failure.
            </AlertDescription>
          </Alert>

          <div className="grid gap-4 md:grid-cols-2">
            {/* From Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">From Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    disabled={(date) => date > new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* To Date */}
            <div className="space-y-2">
              <label className="text-sm font-medium">To Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    disabled={(date) => date > new Date() || (dateRange.from ? date < dateRange.from : false)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Button
            onClick={handleResendClick}
            disabled={!dateRange.from || !dateRange.to || resendMutation.isPending}
            className="w-full"
          >
            <Send className="mr-2 h-4 w-4" />
            {resendMutation.isPending ? 'Re-sending Data...' : 'Re-send Data to RLC'}
          </Button>
        </CardContent>
      </Card>

      {/* Transmission History */}
      <Card>
        <CardHeader>
          <CardTitle>Transmission History</CardTitle>
          <CardDescription>
            Last 10 data transmissions to Robinsons Land Corporation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <p className="text-sm text-muted-foreground">Loading transmission history...</p>
          ) : transmissionHistory && transmissionHistory.length > 0 ? (
            <div className="space-y-3">
              {transmissionHistory.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(log.status)}
                    <div>
                      <p className="text-sm font-medium">{log.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.transmission_date), 'MMM dd, yyyy HH:mm')} • {log.record_count} records
                      </p>
                      {log.error_message && (
                        <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(log.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transmission history available</p>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Re-transmission</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to re-send transaction data to Robinsons Land Corporation:</p>
              <div className="bg-muted p-3 rounded-md mt-2">
                <p><strong>Date Range:</strong></p>
                <p>{dateRange.from && format(dateRange.from, 'MMMM dd, yyyy')} to {dateRange.to && format(dateRange.to, 'MMMM dd, yyyy')}</p>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                This will transmit all transaction data within this date range via SFTP.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmResend}>
              Confirm Re-send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
