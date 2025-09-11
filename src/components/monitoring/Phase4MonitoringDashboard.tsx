/**
 * Phase 4: Inventory Monitoring Dashboard Component
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, XCircle, Activity, RefreshCw } from "lucide-react";
import { useInventoryMonitoring } from "@/hooks/useInventoryMonitoring";
import { format } from "date-fns";

export function Phase4MonitoringDashboard() {
  const { alerts, stats, isLoading, resolveAlert, runSystemHealthCheck } = useInventoryMonitoring();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading monitoring data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 border-green-200">🟢 Healthy</Badge>;
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">🟡 Degraded</Badge>;
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 border-red-200">🔴 Critical</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Activity className="h-5 w-5" />
          Phase 4: Inventory System Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">System Health</p>
                {getHealthBadge(stats.systemHealth)}
              </div>
              <Activity className={`h-8 w-8 ${
                stats.systemHealth === 'healthy' ? 'text-green-500' :
                stats.systemHealth === 'degraded' ? 'text-yellow-500' : 'text-red-500'
              }`} />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Successful Deductions</p>
                <p className="text-2xl font-bold text-green-600">{stats.successfulDeductions}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Deductions</p>
                <p className="text-2xl font-bold text-orange-600">{stats.failedDeductions}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Failures</p>
                <p className="text-2xl font-bold text-red-600">{stats.criticalFailures}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* System Actions */}
        <div className="flex gap-2">
          <Button 
            onClick={runSystemHealthCheck}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Run Health Check
          </Button>
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Alerts ({alerts.length})
            </h4>
            
            <ScrollArea className="h-64 border rounded-md p-3 bg-white">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <Alert key={alert.id} className={`
                    ${alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
                      alert.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                      'border-yellow-300 bg-yellow-50'}
                  `}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        {getSeverityIcon(alert.severity)}
                        <div className="flex-1">
                          <div className="font-medium">{alert.title}</div>
                          <AlertDescription className="mt-1">
                            {alert.message}
                          </AlertDescription>
                          <div className="text-xs text-muted-foreground mt-2">
                            {format(new Date(alert.created_at), 'MMM dd, yyyy HH:mm:ss')}
                          </div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resolveAlert(alert.id)}
                        className="ml-2"
                      >
                        Resolve
                      </Button>
                    </div>
                  </Alert>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {alerts.length === 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              No active alerts. Inventory system is operating normally.
            </AlertDescription>
          </Alert>
        )}

        {/* Last Failure Info */}
        {stats.lastFailureTime && (
          <div className="bg-white p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Last Failure:</p>
            <p className="font-medium">{format(new Date(stats.lastFailureTime), 'MMM dd, yyyy HH:mm:ss')}</p>
          </div>
        )}

        <Separator />
        
        <div className="text-xs text-muted-foreground">
          <p>✅ Phase 4 Implementation Complete:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Simplified inventory deduction architecture</li>
            <li>Mandatory validation checks</li>
            <li>Real-time failure alerting</li>
            <li>Comprehensive system monitoring</li>
            <li>Automatic rollback on failures</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}