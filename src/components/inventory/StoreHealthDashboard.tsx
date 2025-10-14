/**
 * Phase 5: Store Health Dashboard
 * Monitors inventory system health and cross-store mapping status
 */

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw, Shield, AlertTriangle } from "lucide-react";
import { generateSystemHealthReport } from "@/services/inventory/crossStoreMonitoringService";
import { Link } from "react-router-dom";

export function StoreHealthDashboard() {
  const { data: healthReport, isLoading, refetch } = useQuery({
    queryKey: ['system-health-report'],
    queryFn: generateSystemHealthReport,
    refetchInterval: 300000 // Refresh every 5 minutes
  });

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <Shield className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading system health...</div>
        </CardContent>
      </Card>
    );
  }

  if (!healthReport) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load system health report</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Health Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getHealthIcon(healthReport.overall_health)}
              <CardTitle>System Health Status</CardTitle>
            </div>
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
          <CardDescription>
            Cross-store inventory mapping validation and monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Overall Status</p>
              <p className={`text-2xl font-bold ${getHealthColor(healthReport.overall_health)}`}>
                {healthReport.overall_health.toUpperCase()}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Stores Checked</p>
              <p className="text-2xl font-bold">{healthReport.stores_checked}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Healthy Stores</p>
              <p className="text-2xl font-bold text-green-500">{healthReport.healthy_stores}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Stores with Issues</p>
              <p className="text-2xl font-bold text-red-500">{healthReport.stores_with_issues}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Critical Alert */}
      {healthReport.total_issues > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Action Required</AlertTitle>
          <AlertDescription>
            {healthReport.total_issues} inventory mapping {healthReport.total_issues === 1 ? 'issue' : 'issues'} detected across stores.
            Cross-store deductions are being blocked by Phase 1 validation.
            <div className="mt-2">
              <Link to="/admin/inventory/cross-store-repair">
                <Button variant="outline" size="sm">
                  Open Repair Tool
                </Button>
              </Link>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Store Details */}
      <Card>
        <CardHeader>
          <CardTitle>Store-by-Store Health</CardTitle>
          <CardDescription>
            Detailed health status for each store
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthReport.store_details.map((store) => (
              <div key={store.store_id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{store.store_name}</h3>
                    {store.health_status === 'healthy' ? (
                      <Badge variant="outline" className="text-green-500 border-green-500">
                        Healthy
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        {store.issue_count} {store.issue_count === 1 ? 'Issue' : 'Issues'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                {store.issues.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {store.issues.map((issue, index) => (
                      <div key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <span>{issue}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Success Message */}
      {healthReport.total_issues === 0 && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>All Systems Operational</AlertTitle>
          <AlertDescription>
            All stores have healthy inventory mappings. Phase 1, 2, and 3 protections are active.
            No cross-store deduction attempts detected.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
