import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInventorySyncMonitoring } from '@/hooks/useInventorySyncMonitoring';
import { Activity, AlertTriangle, CheckCircle, XCircle, Play, Square } from 'lucide-react';

interface InventorySyncMonitorDashboardProps {
  storeId?: string;
}

export const InventorySyncMonitorDashboard: React.FC<InventorySyncMonitorDashboardProps> = ({
  storeId
}) => {
  const {
    healthStatuses,
    activeAlerts,
    isMonitoring,
    isLoading,
    stats,
    startMonitoring,
    stopMonitoring,
    refreshHealthCheck,
    acknowledgeAlert,
    generateSyncReport
  } = useInventorySyncMonitoring(storeId);

  const handleGenerateReport = async () => {
    try {
      const report = await generateSyncReport();
      console.log('Generated report:', report);
      // You could open a modal or navigate to a detailed report page here
    } catch (error) {
      console.error('Failed to generate report:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Sync Monitor</h2>
          <p className="text-muted-foreground">
            Monitor inventory synchronization health and detect issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => refreshHealthCheck()}
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : 'Refresh'}
          </Button>
          <Button
            variant={isMonitoring ? 'destructive' : 'default'}
            onClick={isMonitoring ? stopMonitoring : () => startMonitoring(5)}
          >
            {isMonitoring ? <Square className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
          </Button>
          <Button
            variant="outline"
            onClick={handleGenerateReport}
          >
            Generate Report
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.healthyCount}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalTransactions > 0 ? ((stats.healthyCount / stats.totalTransactions) * 100).toFixed(1) : 0}% success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Warnings</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warningCount}</div>
            <p className="text-xs text-muted-foreground">
              Sync mismatches
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalCount}</div>
            <p className="text-xs text-muted-foreground">
              Sync failures
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">False Success</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.falseSuccessCount}</div>
            <p className="text-xs text-muted-foreground">
              Reported success, no movements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Alerts</CardTitle>
            <CardDescription>
              {activeAlerts.length} active alert{activeAlerts.length !== 1 ? 's' : ''} requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeAlerts.slice(0, 5).map(alert => (
                <Alert key={alert.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <AlertDescription>
                      <div className="flex items-center gap-2">
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity.toUpperCase()}
                        </Badge>
                        <span>{alert.message}</span>
                      </div>
                    </AlertDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    Acknowledge
                  </Button>
                </Alert>
              ))}
              {activeAlerts.length > 5 && (
                <p className="text-sm text-muted-foreground">
                  And {activeAlerts.length - 5} more alerts...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transaction Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transaction Health</CardTitle>
          <CardDescription>
            Inventory sync status for recent transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthStatuses.slice(0, 10).map(status => (
              <div
                key={status.transactionId}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(status.status)}
                  <div>
                    <div className="font-medium">
                      Transaction {status.transactionId.slice(-8)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {status.itemsProcessed} items processed, {status.actualMovements} movements created
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={status.status === 'healthy' ? 'default' : 
                                 status.status === 'warning' ? 'secondary' : 'destructive'}>
                    {status.status}
                  </Badge>
                  {status.errorDetails && (
                    <div className="text-xs text-muted-foreground mt-1 max-w-xs truncate">
                      {status.errorDetails}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {healthStatuses.length === 0 && !isLoading && (
              <div className="text-center text-muted-foreground py-8">
                No recent transactions found. Click refresh to check for new data.
              </div>
            )}
            {isLoading && (
              <div className="text-center text-muted-foreground py-8">
                Loading health status...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monitoring Status */}
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm">
              {isMonitoring ? 'Real-time monitoring active' : 'Monitoring stopped'}
            </span>
          </div>
          {isMonitoring && (
            <p className="text-xs text-muted-foreground mt-2">
              Checking for sync issues every 5 minutes
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};