import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { transactionHealthMonitor } from '@/services/transactions/transactionHealthMonitor';
import { Activity, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface HealthMetrics {
  systemStatus: 'healthy' | 'degraded' | 'critical';
  successRate: number;
  avgProcessingTime: number;
  errorRate: number;
  inventoryFailureRate: number;
  recommendations: string[];
  lastUpdated: Date;
}

export function TransactionHealthDashboard() {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealthMetrics = async () => {
    try {
      const health = await transactionHealthMonitor.getCurrentHealth();
      setMetrics({
        systemStatus: health.systemStatus,
        successRate: health.successRate,
        avgProcessingTime: health.avgProcessingTime,
        errorRate: health.errorRate,
        inventoryFailureRate: health.inventoryFailureRate,
        recommendations: health.recommendations,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch health metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthMetrics();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchHealthMetrics, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-emerald-600';
      case 'degraded': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-emerald-600" />;
      case 'degraded': return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Transaction Health Monitor</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Disable Auto-refresh' : 'Enable Auto-refresh'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchHealthMetrics}>
            Refresh Now
          </Button>
        </div>
      </div>

      {/* System Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              {metrics && getStatusIcon(metrics.systemStatus)}
              <div>
                <div className="text-sm text-muted-foreground">System Status</div>
                <div className={`font-semibold capitalize ${metrics && getStatusColor(metrics.systemStatus)}`}>
                  {metrics?.systemStatus || 'Unknown'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              <div>
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="font-semibold text-emerald-600">
                  {metrics?.successRate.toFixed(1) || '0'}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm text-muted-foreground">Avg Processing</div>
                <div className="font-semibold text-blue-600">
                  {metrics?.avgProcessingTime.toFixed(0) || '0'}ms
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <div>
                <div className="text-sm text-muted-foreground">Inventory Failure Rate</div>
                <div className="font-semibold">{metrics?.inventoryFailureRate.toFixed(1) || '0'}%</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList>
          <TabsTrigger value="metrics">Performance Metrics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate</CardTitle>
                <CardDescription>Transaction processing success percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{metrics?.successRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={metrics?.successRate || 0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate</CardTitle>
                <CardDescription>Transaction processing error percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>{metrics?.errorRate.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={metrics?.errorRate || 0} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Processing Performance</CardTitle>
              <CardDescription>Average transaction processing time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {metrics?.avgProcessingTime.toFixed(0)}ms
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Target: Under 2000ms for optimal performance
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
              <CardDescription>
                Automated recommendations based on current performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {metrics?.recommendations.length ? (
                <div className="space-y-3">
                  {metrics.recommendations.map((recommendation, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{recommendation}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
                  <p>All systems operating optimally!</p>
                  <p className="text-sm">No recommendations at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {metrics?.lastUpdated && (
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {metrics.lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}