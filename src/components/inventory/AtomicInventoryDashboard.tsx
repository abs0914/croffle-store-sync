/**
 * Atomic Inventory Dashboard
 * Comprehensive monitoring and management interface for the atomic inventory system
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RefreshCw,
  TrendingUp,
  Clock,
  Database,
  Shield
} from 'lucide-react';
import { AtomicInventoryMonitor, InventoryHealth, DeductionMetrics, QueueMetrics } from '@/services/inventory/atomicInventoryMonitor';
import { OfflineQueueManager } from './OfflineQueueManager';
import { useStore } from '@/contexts/StoreContext';
import { toast } from 'sonner';

export const AtomicInventoryDashboard: React.FC = () => {
  const { currentStore } = useStore();
  const [health, setHealth] = useState<InventoryHealth | null>(null);
  const [metrics, setMetrics] = useState<DeductionMetrics | null>(null);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const loadDashboard = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    try {
      const [healthData, metricsData, queueData] = await Promise.all([
        AtomicInventoryMonitor.runHealthCheck(currentStore.id),
        AtomicInventoryMonitor.getDeductionMetrics(currentStore.id),
        AtomicInventoryMonitor.getQueueMetrics(currentStore.id)
      ]);
      
      setHealth(healthData);
      setMetrics(metricsData);
      setQueueMetrics(queueData);
      
      if (healthData.status === 'critical') {
        toast.error('Critical inventory system issues detected');
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    
    if (autoRefresh) {
      const interval = setInterval(loadDashboard, 30000);
      return () => clearInterval(interval);
    }
  }, [currentStore?.id, autoRefresh]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500';
      case 'warning':
        return 'border-yellow-500';
      case 'critical':
        return 'border-red-500';
      default:
        return 'border-gray-500';
    }
  };

  if (!currentStore) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Please select a store to view the dashboard</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Atomic Inventory System</h1>
          <p className="text-muted-foreground">
            Real-time monitoring for {currentStore.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Status */}
      {health && (
        <Card className={`border-l-4 ${getStatusColor(health.status)}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.status)}
                <div>
                  <h3 className="text-lg font-semibold">
                    System Status: {health.status.toUpperCase()}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {health.summary.healthy}/{health.summary.total} checks passing
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{health.summary.healthy}</div>
                  <div className="text-xs text-green-600">Healthy</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{health.summary.warnings}</div>
                  <div className="text-xs text-yellow-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{health.summary.critical}</div>
                  <div className="text-xs text-red-600">Critical</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Deduction Success Rate */}
            {metrics && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Success Rate (24h)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(100 - metrics.last_24h.failure_rate).toFixed(1)}%
                  </div>
                  <Progress 
                    value={100 - metrics.last_24h.failure_rate} 
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {metrics.last_24h.deductions} deductions, {metrics.last_24h.failures} failed
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Queue Status */}
            {queueMetrics && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Pending Queue
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{queueMetrics.pending}</div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Waiting for sync
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Needs Approval
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">
                      {queueMetrics.insufficient_stock}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Insufficient stock
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Avg Wait Time
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {queueMetrics.avg_wait_time_minutes.toFixed(0)}m
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Time to approval
                    </p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Key Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Atomic Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                All-or-nothing deductions with optimistic locking prevent partial failures
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Store Isolation
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Guaranteed no cross-store deductions with store-filtered mappings
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Idempotency
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Duplicate request protection prevents double deductions
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Health Checks Tab */}
        <TabsContent value="health" className="space-y-4">
          {health?.checks.map((check, idx) => (
            <Card key={idx} className={`border-l-4 ${getStatusColor(check.status)}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(check.status)}
                    <CardTitle className="text-base">{check.name}</CardTitle>
                  </div>
                  <Badge variant={check.status === 'healthy' ? 'default' : 'destructive'}>
                    {check.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{check.message}</p>
                {check.details && (
                  <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto">
                    {JSON.stringify(check.details, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Queue Management Tab */}
        <TabsContent value="queue">
          <OfflineQueueManager storeId={currentStore.id} />
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Deductions</CardTitle>
                  <CardDescription>All-time inventory deductions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.total_deductions}</div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Successful</span>
                      <span className="font-medium text-green-600">{metrics.successful}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Failed</span>
                      <span className="font-medium text-red-600">{metrics.failed}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Last 24 Hours</CardTitle>
                  <CardDescription>Recent deduction performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.last_24h.deductions}</div>
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Failures</span>
                      <span className="font-medium text-red-600">{metrics.last_24h.failures}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Failure Rate</span>
                      <span className="font-medium">
                        {metrics.last_24h.failure_rate.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {queueMetrics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Queue Statistics</CardTitle>
                      <CardDescription>Offline transaction queue status</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pending</span>
                          <span className="font-medium">{queueMetrics.pending}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Need Approval</span>
                          <span className="font-medium text-yellow-600">
                            {queueMetrics.insufficient_stock}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Approved</span>
                          <span className="font-medium text-green-600">{queueMetrics.approved}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Rejected</span>
                          <span className="font-medium text-red-600">{queueMetrics.rejected}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Footer */}
      {health && (
        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          Last updated: {new Date(health.timestamp).toLocaleString()}
          {autoRefresh && ' • Auto-refreshes every 30 seconds'}
        </div>
      )}
    </div>
  );
};
