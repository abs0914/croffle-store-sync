import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle, Wrench, RefreshCw } from 'lucide-react';
import { 
  ProductIntegrityService, 
  type ProductIntegrityReport 
} from '@/services/maintenance/productIntegrityService';

interface ProductIntegrityDashboardProps {
  storeId?: string;
}

export const ProductIntegrityDashboard: React.FC<ProductIntegrityDashboardProps> = ({
  storeId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5'
}) => {
  const [report, setReport] = useState<ProductIntegrityReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);
  const [lastMaintenanceResult, setLastMaintenanceResult] = useState<any>(null);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const newReport = await ProductIntegrityService.analyzeIntegrity(storeId);
      setReport(newReport);
    } catch (error) {
      console.error('Failed to load integrity report:', error);
      toast.error('Failed to load product integrity report');
    } finally {
      setIsLoading(false);
    }
  };

  const runMaintenance = async () => {
    setIsRunningMaintenance(true);
    try {
      const result = await ProductIntegrityService.runCompleteMaintenance(storeId);
      setLastMaintenanceResult(result);
      setReport(result.finalReport);
      
      if (result.overall.success) {
        toast.success(result.overall.message);
      } else {
        toast.warning(result.overall.message);
      }
    } catch (error) {
      console.error('Maintenance failed:', error);
      toast.error('Maintenance operation failed');
    } finally {
      setIsRunningMaintenance(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [storeId]);

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 95) return <Badge variant="default" className="bg-green-500">Excellent</Badge>;
    if (percentage >= 80) return <Badge variant="secondary">Good</Badge>;
    if (percentage >= 60) return <Badge variant="outline">Needs Attention</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'text-green-600';
    if (percentage >= 80) return 'text-blue-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Product Catalog Integrity
          </CardTitle>
          <CardDescription>
            Monitor and maintain product catalog health, recipe template associations, and inventory sync
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={loadReport} disabled={isLoading} variant="outline">
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Report
            </Button>
            <Button 
              onClick={runMaintenance} 
              disabled={isRunningMaintenance || isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isRunningMaintenance ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wrench className="h-4 w-4 mr-2" />
              )}
              Run Maintenance
            </Button>
          </div>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading integrity report...
            </div>
          )}

          {report && (
            <div className="space-y-4">
              {/* Overall Status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Template Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-2xl font-bold ${getStatusColor(report.completionPercentage)}`}>
                        {report.completionPercentage}%
                      </span>
                      {getStatusBadge(report.completionPercentage)}
                    </div>
                    <Progress value={report.completionPercentage} className="mb-2" />
                    <p className="text-xs text-muted-foreground">
                      {report.productsWithCompleteTemplates} of {report.totalProducts} products have complete recipe templates
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Missing Templates</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-orange-600">
                        {report.productsMissingTemplates}
                      </span>
                      {report.productsMissingTemplates > 0 ? (
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Products without proper recipe template association
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Orphaned Products</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-bold text-red-600">
                        {report.orphanedProducts}
                      </span>
                      {report.orphanedProducts > 0 ? (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Products without any matching templates
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Maintenance Results */}
              {lastMaintenanceResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Last Maintenance Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Duplicate Cleanup</h4>
                        <Badge variant={lastMaintenanceResult.duplicateCleanup.success ? "default" : "destructive"}>
                          {lastMaintenanceResult.duplicateCleanup.success ? "Success" : "Failed"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lastMaintenanceResult.duplicateCleanup.message}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Template Fix</h4>
                        <Badge variant={lastMaintenanceResult.templateFix.success ? "default" : "destructive"}>
                          {lastMaintenanceResult.templateFix.success ? "Success" : "Failed"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lastMaintenanceResult.templateFix.message}
                        </p>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Recipe Repair</h4>
                        <Badge variant={lastMaintenanceResult.recipeRepair.success ? "default" : "destructive"}>
                          {lastMaintenanceResult.recipeRepair.success ? "Success" : "Failed"}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {lastMaintenanceResult.recipeRepair.message}
                        </p>
                      </div>
                    </div>

                    {lastMaintenanceResult.recipeRepair.details?.summary && (
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <h5 className="font-medium mb-2">Recipe Repair Summary</h5>
                        <div className="text-sm space-y-1">
                          <p>• Linked existing recipes: {lastMaintenanceResult.recipeRepair.details.summary.linkedExistingRecipes}</p>
                          <p>• Created missing recipes: {lastMaintenanceResult.recipeRepair.details.summary.createdMissingRecipes}</p>
                          <p>• Created basic templates: {lastMaintenanceResult.recipeRepair.details.summary.createdBasicTemplates}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};