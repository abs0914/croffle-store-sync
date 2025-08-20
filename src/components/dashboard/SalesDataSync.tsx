import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/format";
import { format } from "date-fns";

interface SalesDataSyncProps {
  storeId: string;
}

interface SyncStatus {
  hasMetrics: boolean;
  hasTransactions: boolean;
  metricsData: any;
  transactionCount: number;
  lastSync: string | null;
  syncIssues: string[];
}

export default function SalesDataSync({ storeId }: SalesDataSyncProps) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    hasMetrics: false,
    hasTransactions: false,
    metricsData: null,
    transactionCount: 0,
    lastSync: null,
    syncIssues: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSyncStatus = async () => {
      if (!storeId) return;

      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Check store_metrics data
        const { data: metricsData, error: metricsError } = await supabase
          .from('store_metrics')
          .select('*')
          .eq('store_id', storeId)
          .eq('metric_date', today)
          .single();

        // Check transactions data
        const { data: transactionsData, error: transactionsError } = await supabase
          .from('transactions')
          .select('id, total, created_at')
          .eq('store_id', storeId)
          .eq('status', 'completed')
          .gte('created_at', `${today}T00:00:00`)
          .lte('created_at', `${today}T23:59:59`);

        const issues: string[] = [];
        
        // Check for sync issues
        if (metricsData && (!transactionsData || transactionsData.length === 0)) {
          issues.push("Sales metrics exist but no individual transactions found");
        }
        
        if (metricsData && transactionsData) {
          const transactionTotal = transactionsData.reduce((sum, tx) => sum + tx.total, 0);
          const metricTotal = metricsData.total_sales;
          
          if (Math.abs(transactionTotal - metricTotal) > 0.01) {
            issues.push(`Transaction total (${formatCurrency(transactionTotal)}) doesn't match metrics (${formatCurrency(metricTotal)})`);
          }
        }

        setSyncStatus({
          hasMetrics: !!metricsData,
          hasTransactions: !!(transactionsData && transactionsData.length > 0),
          metricsData,
          transactionCount: transactionsData?.length || 0,
          lastSync: metricsData?.updated_at || null,
          syncIssues: issues
        });

      } catch (error) {
        console.error('Error checking sync status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSyncStatus();
  }, [storeId]);

  const getSyncHealthColor = () => {
    if (syncStatus.syncIssues.length > 0) return 'text-red-600';
    if (syncStatus.hasMetrics && syncStatus.hasTransactions) return 'text-green-600';
    return 'text-orange-600';
  };

  const getSyncHealthText = () => {
    if (syncStatus.syncIssues.length > 0) return 'Sync Issues';
    if (syncStatus.hasMetrics && syncStatus.hasTransactions) return 'Healthy';
    if (syncStatus.hasMetrics && !syncStatus.hasTransactions) return 'Partial Data';
    return 'No Data';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Data Sync Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Checking sync status...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sales Data Status
          </div>
          <Badge variant={syncStatus.syncIssues.length > 0 ? 'destructive' : 'default'}>
            {getSyncHealthText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {syncStatus.metricsData && (
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Today's Sales</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(syncStatus.metricsData.total_sales)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Orders</p>
              <p className="text-xl font-bold text-blue-600">
                {syncStatus.metricsData.total_orders}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Store Metrics</span>
            <div className="flex items-center gap-2">
              {syncStatus.hasMetrics ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">{syncStatus.hasMetrics ? 'Available' : 'Missing'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Transaction Records</span>
            <div className="flex items-center gap-2">
              {syncStatus.hasTransactions ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm">
                {syncStatus.hasTransactions ? `${syncStatus.transactionCount} found` : 'None found'}
              </span>
            </div>
          </div>
        </div>

        {syncStatus.lastSync && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Last updated: {format(new Date(syncStatus.lastSync), 'MMM dd, HH:mm')}
          </div>
        )}

        {syncStatus.syncIssues.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-600">Sync Issues:</p>
            {syncStatus.syncIssues.map((issue, index) => (
              <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-2 border-red-200">
                {issue}
              </div>
            ))}
          </div>
        )}

        {!syncStatus.hasMetrics && !syncStatus.hasTransactions && (
          <div className="text-center py-4">
            <AlertTriangle className="h-8 w-8 text-orange-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No sales data found for today</p>
            <p className="text-xs text-muted-foreground">Check POS system integration</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}