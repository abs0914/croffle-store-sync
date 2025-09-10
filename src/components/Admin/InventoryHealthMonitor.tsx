/**
 * Inventory Health Monitor Component
 * Phase 4: Data Verification - Real-time health monitoring dashboard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { runInventoryHealthCheck, SystemHealthReport, HealthCheckResult } from "@/services/inventory/inventoryHealthService";
import { deployAndFixAllRecipeTemplates } from "@/services/recipeManagement/enhancedDeploymentService";
import { validateInventoryDeductionSystem, validateSpecificItems } from "@/services/inventory/inventorySystemValidator";
import { toast } from "sonner";

interface InventoryHealthMonitorProps {
  storeId: string;
  storeName: string;
}

export const InventoryHealthMonitor: React.FC<InventoryHealthMonitorProps> = ({
  storeId,
  storeName
}) => {
  const [healthReport, setHealthReport] = useState<SystemHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Test items for validation
  const testItems = [
    { name: 'Americano Iced', quantity: 1, unit_price: 65, total_price: 65 },
    { name: 'Caramel Latte Iced', quantity: 1, unit_price: 85, total_price: 85 },
    { name: 'Cafe Mocha Iced', quantity: 1, unit_price: 85, total_price: 85 }
  ];

  const runHealthCheck = async () => {
    setIsLoading(true);
    try {
      const report = await runInventoryHealthCheck(storeId);
      setHealthReport(report);
      
      if (report.overallStatus === 'critical') {
        toast.error(`Critical health issues detected for ${storeName}`);
      } else if (report.overallStatus === 'warning') {
        toast.warning(`Health warnings detected for ${storeName}`);
      } else {
        toast.success(`All systems healthy for ${storeName}`);
      }
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Failed to run health check');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFullValidation = async () => {
    setIsValidating(true);
    try {
      const report = await validateInventoryDeductionSystem(storeId, testItems);
      
      if (report.overallSuccess) {
        toast.success(`✅ COMPLETE VALIDATION PASSED: All ${report.summary.total} checks successful`);
      } else {
        toast.error(`❌ VALIDATION FAILED: ${report.summary.failed}/${report.summary.total} checks failed`);
      }
      
      // Show detailed results
      console.log('🧪 FULL VALIDATION REPORT:', report);
      
      // Re-run health check after validation
      setTimeout(() => {
        runHealthCheck();
      }, 2000);
    } catch (error) {
      console.error('Full validation failed:', error);
      toast.error('Failed to run complete validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleQuickFix = async () => {
    setIsDeploying(true);
    try {
      const result = await deployAndFixAllRecipeTemplates();
      toast.success(`Fixed ${result.fixed_recipes} recipes, deployed ${result.deployed_recipes} to ${result.total_stores} stores`);
      
      // Re-run health check after fix
      setTimeout(() => {
        runHealthCheck();
      }, 2000);
    } catch (error) {
      console.error('Quick fix failed:', error);
      toast.error('Failed to run quick fix');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleQuickItemCheck = async () => {
    try {
      const itemNames = testItems.map(item => item.name);
      const result = await validateSpecificItems(storeId, itemNames);
      
      if (result.success) {
        toast.success(`✅ All ${result.validItems.length} test items are valid`);
      } else {
        toast.warning(`⚠️ ${result.invalidItems.length}/${itemNames.length} items have issues: ${result.invalidItems.join(', ')}`);
      }
      
      console.log('🧪 ITEM VALIDATION RESULT:', result);
    } catch (error) {
      console.error('Item validation failed:', error);
      toast.error('Failed to validate items');
    }
  };

  const toggleCheckExpansion = (component: string) => {
    const newExpanded = new Set(expandedChecks);
    if (newExpanded.has(component)) {
      newExpanded.delete(component);
    } else {
      newExpanded.add(component);
    }
    setExpandedChecks(newExpanded);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(runHealthCheck, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, storeId]);

  // Initial load
  useEffect(() => {
    runHealthCheck();
  }, [storeId]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Inventory System Health</span>
              {healthReport && getStatusIcon(healthReport.overallStatus)}
            </CardTitle>
            <CardDescription>
              Real-time monitoring for {storeName}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runHealthCheck}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickItemCheck}
            >
              Quick Item Check
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleQuickFix}
              disabled={isDeploying || !healthReport || healthReport.overallStatus === 'healthy'}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isDeploying ? 'animate-spin' : ''}`} />
              Quick Fix
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleFullValidation}
              disabled={isValidating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isValidating ? 'animate-spin' : ''}`} />
              Full Validation
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading && !healthReport && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Running health check...</span>
          </div>
        )}

        {healthReport && (
          <>
            {/* Overall Status */}
            <Alert className={`border-l-4 ${getStatusColor(healthReport.overallStatus)} border-l-4`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(healthReport.overallStatus)}
                  <AlertDescription className="font-medium">
                    Overall Status: {healthReport.overallStatus.toUpperCase()}
                  </AlertDescription>
                </div>
                <Badge variant="outline">
                  {healthReport.summary.healthy}H / {healthReport.summary.warnings}W / {healthReport.summary.critical}C
                </Badge>
              </div>
            </Alert>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {healthReport.summary.healthy}
                  </div>
                  <div className="text-sm text-green-600">Healthy</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {healthReport.summary.warnings}
                  </div>
                  <div className="text-sm text-yellow-600">Warnings</div>
                </CardContent>
              </Card>
              <Card className="border-red-200">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {healthReport.summary.critical}
                  </div>
                  <div className="text-sm text-red-600">Critical</div>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Checks */}
            <div className="space-y-2">
              <h3 className="font-medium">Detailed Health Checks</h3>
              {healthReport.checks.map((check: HealthCheckResult, index: number) => (
                <Card key={index} className={`border-l-4 ${getStatusColor(check.status)}`}>
                  <Collapsible>
                    <CollapsibleTrigger 
                      className="w-full"
                      onClick={() => toggleCheckExpansion(check.component)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(check.status)}
                            <div className="text-left">
                              <div className="font-medium">{check.component}</div>
                              <div className="text-sm text-muted-foreground">
                                {check.message}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={check.status === 'healthy' ? 'default' : 
                                      check.status === 'warning' ? 'secondary' : 'destructive'}
                            >
                              {check.status}
                            </Badge>
                            {expandedChecks.has(check.component) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4 px-4">
                        <div className="bg-muted p-3 rounded-md">
                          <pre className="text-sm overflow-auto">
                            {JSON.stringify(check.details, null, 2)}
                          </pre>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          Last checked: {new Date(check.timestamp).toLocaleString()}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>

            {/* Footer */}
            <div className="text-xs text-muted-foreground text-center pt-4 border-t">
              Last updated: {new Date(healthReport.generatedAt).toLocaleString()}
              {autoRefresh && " • Auto-refreshes every 30 seconds"}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};