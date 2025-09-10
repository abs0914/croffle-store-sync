import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wrench, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { repairInventorySystem, checkInventorySystemHealth, InventoryRepairResult } from "@/services/inventory/inventoryRepairService";
import { useQuery } from "@tanstack/react-query";

interface InventorySystemRepairProps {
  storeId: string;
}

export function InventorySystemRepair({ storeId }: InventorySystemRepairProps) {
  const [isRepairing, setIsRepairing] = useState(false);
  const [processHistorical, setProcessHistorical] = useState(false);
  const [repairResult, setRepairResult] = useState<InventoryRepairResult | null>(null);

  const { data: healthCheck, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
    queryKey: ['inventory-health', storeId],
    queryFn: () => checkInventorySystemHealth(storeId),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleRepair = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    
    try {
      const result = await repairInventorySystem(storeId, processHistorical);
      setRepairResult(result);
      
      // Refresh health check after repair
      setTimeout(() => {
        refetchHealth();
      }, 2000);
    } catch (error) {
      console.error('Repair failed:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  const getHealthStatus = () => {
    if (healthLoading) return { status: 'checking', color: 'secondary' as const, icon: Clock };
    if (!healthCheck) return { status: 'unknown', color: 'secondary' as const, icon: AlertTriangle };
    if (healthCheck.healthy) return { status: 'healthy', color: 'default' as const, icon: CheckCircle };
    return { status: 'needs_repair', color: 'destructive' as const, icon: AlertTriangle };
  };

  const healthStatus = getHealthStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Inventory System Repair
        </CardTitle>
        <CardDescription>
          Fix recipe-product linkage issues and restore missing inventory deductions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Status */}
        <div className="flex items-center justify-between p-3 border rounded-lg">
          <div className="flex items-center gap-2">
            <healthStatus.icon className="h-4 w-4" />
            <span className="font-medium">System Health</span>
          </div>
          <Badge variant={healthStatus.color}>
            {healthStatus.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {healthCheck && !healthCheck.healthy && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <div className="font-medium">Issues detected:</div>
                {healthCheck.issues.map((issue, index) => (
                  <div key={index} className="text-sm">• {issue}</div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Repair Options */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="process-historical"
              checked={processHistorical}
              onCheckedChange={(checked) => setProcessHistorical(checked === true)}
            />
            <label htmlFor="process-historical" className="text-sm font-medium">
              Process historical transactions (last 30 days)
            </label>
          </div>
          <div className="text-xs text-muted-foreground ml-6">
            This will apply inventory deductions to recent transactions that may have been missed
          </div>
        </div>

        {/* Repair Button */}
        <Button 
          onClick={handleRepair}
          disabled={isRepairing || healthCheck?.healthy}
          className="w-full"
        >
          {isRepairing ? (
            <>
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Repairing System...
            </>
          ) : (
            <>
              <Wrench className="h-4 w-4 mr-2" />
              {healthCheck?.healthy ? 'System Healthy' : 'Repair Inventory System'}
            </>
          )}
        </Button>

        {/* Repair Results */}
        {repairResult && (
          <div className="mt-4 p-4 border rounded-lg space-y-2">
            <div className="font-medium">
              {repairResult.success ? '✅ Repair Completed' : '⚠️ Repair Completed with Issues'}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Recipes Linked:</span>
                <span className="ml-2 font-medium">{repairResult.recipesLinked}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Transactions Processed:</span>
                <span className="ml-2 font-medium">{repairResult.transactionsProcessed}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Items Deducted:</span>
                <span className="ml-2 font-medium">{repairResult.inventoryDeducted}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Warnings:</span>
                <span className="ml-2 font-medium">{repairResult.warnings.length}</span>
              </div>
            </div>

            {repairResult.errors.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-1">
                    <div className="font-medium">Errors:</div>
                    {repairResult.errors.slice(0, 3).map((error, index) => (
                      <div key={index} className="text-xs">• {error}</div>
                    ))}
                    {repairResult.errors.length > 3 && (
                      <div className="text-xs">... and {repairResult.errors.length - 3} more</div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}