import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { RefreshCw, Download, CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RobinsonsTransmissionMonitorProps {
  storeId: string;
}

export function RobinsonsTransmissionMonitor({ storeId }: RobinsonsTransmissionMonitorProps) {
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['robinsons-transmission-log', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('robinsons_transmission_log')
        .select('*')
        .eq('store_id', storeId)
        .order('transmission_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Success</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const downloadFile = (log: any) => {
    const blob = new Blob([log.file_content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = log.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transmission History</CardTitle>
              <CardDescription>Recent Robinsons data transmissions</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transmission history...</div>
          ) : !logs || logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No transmission history found</div>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{log.file_name}</span>
                      {getStatusBadge(log.status)}
                      <Badge variant="outline">{log.transmission_type || 'auto'}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Date: {format(new Date(log.transmission_date), 'PPP')} • 
                      Transactions: {log.record_count} • 
                      EOD Counter: {log.eod_counter}
                    </div>
                    {log.error_message && (
                      <div className="text-sm text-destructive">Error: {log.error_message}</div>
                    )}
                    {log.sftp_response && (
                      <div className="text-xs text-muted-foreground">Response: {log.sftp_response}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => downloadFile(log)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Content Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedLog?.file_name}</DialogTitle>
            <DialogDescription>
              30-line TXT format file content
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] w-full rounded border p-4">
            <pre className="text-xs font-mono whitespace-pre">
              {selectedLog?.file_content}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
