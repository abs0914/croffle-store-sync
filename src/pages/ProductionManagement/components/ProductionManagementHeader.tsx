import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Layers, AlertTriangle, Clock } from "lucide-react";

interface ProductionManagementHeaderProps {
  pendingConversions: number;
  lowStockAlerts: number;
  onBulkConversion: () => void;
  onRefresh: () => void;
}

export function ProductionManagementHeader({
  pendingConversions,
  lowStockAlerts,
  onBulkConversion,
  onRefresh
}: ProductionManagementHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Management</h1>
          <p className="text-muted-foreground">
            Convert raw materials to finished products and manage repackaging processes
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onRefresh}>
            <Clock className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={onBulkConversion} disabled={pendingConversions === 0}>
            <Layers className="h-4 w-4 mr-2" />
            Bulk Process ({pendingConversions})
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <div className="text-sm text-muted-foreground">Pending Conversions</div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-2xl font-bold">{pendingConversions}</div>
              {pendingConversions > 0 && (
                <Badge variant="secondary" className="text-xs">
                  Ready for Processing
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div className="text-sm text-muted-foreground">Store Requests</div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <div className="text-2xl font-bold">{lowStockAlerts}</div>
              {lowStockAlerts > 0 && (
                <Badge variant="destructive" className="text-xs">
                  Low Stock Alerts
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-600" />
              <div className="text-sm text-muted-foreground">Today's Output</div>
            </div>
            <div className="text-2xl font-bold">24</div>
            <div className="text-xs text-muted-foreground">Conversion batches</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <div className="text-sm text-muted-foreground">Efficiency</div>
            </div>
            <div className="text-2xl font-bold">96%</div>
            <div className="text-xs text-muted-foreground">Material utilization</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Alert */}
      {(pendingConversions > 5 || lowStockAlerts > 3) && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-medium text-yellow-800">Action Required</h4>
                <p className="text-sm text-yellow-700">
                  {pendingConversions > 5 && `${pendingConversions} conversion requests are waiting for processing. `}
                  {lowStockAlerts > 3 && `${lowStockAlerts} stores have reported low stock alerts. `}
                  Consider using bulk processing to improve efficiency.
                </p>
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={onBulkConversion}
                  disabled={pendingConversions === 0}
                >
                  Process All Pending
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}