import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Database, 
  Mail, 
  Upload,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ExportLogEntry {
  id: string;
  store_id: string;
  export_type: string;
  filename: string;
  transaction_count: number;
  detail_count: number;
  email_sent: boolean;
  sftp_uploaded: boolean;
  staging: boolean;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

interface MonitorStats {
  totalExports: number;
  successfulExports: number;
  failedExports: number;
  lastExport?: ExportLogEntry;
  recentErrors: ExportLogEntry[];
}

export const SMProductionMonitor: React.FC = () => {
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [recentLogs, setRecentLogs] = useState<ExportLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadMonitoringData = async () => {
    try {
      setLoading(true);

      // Get recent export logs
      const { data: logs, error: logsError } = await supabase
        .from('sm_export_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) {
        throw logsError;
      }

      setRecentLogs(logs as any[] || []);

      // Calculate statistics
      const totalExports = logs?.length || 0;
      const successfulExports = logs?.filter(log => !log.error_message).length || 0;
      const failedExports = totalExports - successfulExports;
      const lastExport = logs?.[0] as any;
      const recentErrors = logs?.filter(log => log.error_message).slice(0, 5) as any[] || [];

      setStats({
        totalExports,
        successfulExports,
        failedExports,
        lastExport,
        recentErrors
      });

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
      toast({
        title: "Monitoring Error",
        description: "Failed to load SM export monitoring data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerManualExport = async (storeId: string, staging: boolean = true) => {
    try {
      const { data, error } = await supabase.functions.invoke('sm-accreditation-scheduler', {
        body: {
          action: 'execute_hourly_export',
          config: {
            enabled: true,
            emailTo: staging ? 'staging@sm.com.ph' : 'production@sm.com.ph',
            staging,
            storeId,
            storeName: 'Manual Export'
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Manual Export Started",
        description: `SM export triggered for ${staging ? 'staging' : 'production'} environment`,
        variant: "default"
      });

      // Refresh monitoring data
      setTimeout(loadMonitoringData, 2000);

    } catch (error) {
      console.error('Manual export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to trigger manual SM export",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadMonitoringData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMonitoringData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading monitoring data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Exports</p>
                <p className="text-2xl font-bold">{stats?.totalExports || 0}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Successful</p>
                <p className="text-2xl font-bold text-green-600">{stats?.successfulExports || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats?.failedExports || 0}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Last Export</p>
                <p className="text-sm font-bold">
                  {stats?.lastExport ? 
                    new Date(stats.lastExport.created_at).toLocaleString() : 
                    'Never'
                  }
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Errors Alert */}
      {stats?.recentErrors && stats.recentErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{stats.recentErrors.length} recent export error(s) detected.</strong>
            <br />
            Latest: {stats.recentErrors[0].error_message}
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Manual Export Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button 
              onClick={() => triggerManualExport('test-store-id', true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Trigger Staging Export
            </Button>
            
            <Button 
              onClick={() => triggerManualExport('test-store-id', false)}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Trigger Production Export
            </Button>

            <Button 
              onClick={loadMonitoringData}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          
          <Alert>
            <AlertDescription>
              Manual exports are useful for testing and recovery. Production exports should normally run automatically via cron jobs.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Recent Export Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Export Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLogs.length === 0 ? (
              <p className="text-muted-foreground">No export logs found.</p>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {log.error_message ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    
                    <div>
                      <p className="font-medium">{log.filename}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                      {log.error_message && (
                        <p className="text-sm text-red-600">{log.error_message}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant={log.staging ? "secondary" : "default"}>
                      {log.staging ? "Staging" : "Production"}
                    </Badge>
                    
                    <div className="flex gap-1">
                      <Badge variant={log.email_sent ? "default" : "destructive"} className="text-xs">
                        <Mail className="h-3 w-3 mr-1" />
                        {log.email_sent ? "Sent" : "Failed"}
                      </Badge>
                      
                      <Badge variant={log.sftp_uploaded ? "default" : "secondary"} className="text-xs">
                        <Upload className="h-3 w-3 mr-1" />
                        {log.sftp_uploaded ? "Uploaded" : "N/A"}
                      </Badge>
                    </div>
                    
                    <div className="text-right text-sm">
                      <p>{log.transaction_count} transactions</p>
                      <p className="text-muted-foreground">{log.detail_count} details</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};