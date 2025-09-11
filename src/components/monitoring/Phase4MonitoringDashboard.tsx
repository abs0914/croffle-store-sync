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
  const {
    alerts,
    stats,
    isLoading,
    resolveAlert,
    runSystemHealthCheck
  } = useInventoryMonitoring();
  if (isLoading) {
    return <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading monitoring data...
          </div>
        </CardContent>
      </Card>;
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
  return;
}