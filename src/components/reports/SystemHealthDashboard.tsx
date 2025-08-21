import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Zap,
  TrendingUp,
  Package,
  AlertCircle,
  Brain,
  BarChart3,
  Truck
} from "lucide-react";
import { masterControl } from '@/services';
import { toast } from "sonner";

interface SystemHealthProps {
  storeId?: string;
}

const SystemHealthDashboard: React.FC<SystemHealthProps> = ({ storeId }) => {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [predictiveLoading, setPredictiveLoading] = useState(false);

  const fetchHealthData = async () => {
    setLoading(true);
    try {
      const data = await masterControl.getSystemHealthReport(storeId);
      setHealthData(data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch health data:', error);
      toast.error('Failed to load system health data');
    } finally {
      setLoading(false);
    }
  };

  const triggerPredictiveReordering = async () => {
    if (!storeId) return;
    
    setPredictiveLoading(true);
    try {
      await masterControl.triggerPredictiveReordering(storeId);
      await fetchHealthData(); // Refresh data
    } catch (error) {
      toast.error('Failed to trigger predictive reordering');
    } finally {
      setPredictiveLoading(false);
    }
  };

  const refreshAvailability = async () => {
    setLoading(true);
    try {
      await masterControl.refreshAvailability(storeId);
      await fetchHealthData(); // Refresh data
    } catch (error) {
      toast.error('Failed to refresh availability');
    } finally {
      setLoading(false);
    }
  };

  const runEmergencyRepair = async () => {
    if (!storeId) {
      toast.error('Store ID required for emergency repair');
      return;
    }
    
    setLoading(true);
    try {
      await masterControl.emergencyRepair(storeId);
      await fetchHealthData(); // Refresh data after repair
    } catch (error) {
      toast.error('Emergency repair failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthData();
  }, [storeId]);

  const getHealthStatus = () => {
    if (!healthData?.healthReport) return { status: 'unknown', color: 'gray' };
    
    const { totalIssues, resolved, failed } = healthData.healthReport;
    
    if (totalIssues === 0) return { status: 'excellent', color: 'green' };
    if (failed === 0) return { status: 'good', color: 'blue' };
    if (failed < totalIssues / 2) return { status: 'warning', color: 'yellow' };
    return { status: 'critical', color: 'red' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Health & Architecture</h2>
          <p className="text-muted-foreground">
            Real-time monitoring and predictive analytics for your restaurant operations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchHealthData} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {storeId && (
            <Button onClick={runEmergencyRepair} disabled={loading} variant="destructive">
              <Zap className="h-4 w-4 mr-2" />
              Emergency Repair
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="realtime">Real-time</TabsTrigger>
          <TabsTrigger value="predictive">Predictive</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <Activity className={`h-4 w-4 text-${healthStatus.color}-600`} />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold text-${healthStatus.color}-600`}>
                  {healthStatus.status.toUpperCase()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Never updated'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Auto-Repairs</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData?.healthReport?.resolved || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Issues automatically fixed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData?.healthReport?.failed || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Require manual attention
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Available Products</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {healthData?.validationSummary?.sellable || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready for sale
                </p>
              </CardContent>
            </Card>
          </div>

          {healthData?.healthReport && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>System Health Progress</CardTitle>
                <CardDescription>Overall system integrity and performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Template Sync</span>
                      <span>{healthData.healthReport.details.templateSync.repaired}/{healthData.healthReport.details.templateSync.detected}</span>
                    </div>
                    <Progress 
                      value={healthData.healthReport.details.templateSync.detected > 0 
                        ? (healthData.healthReport.details.templateSync.repaired / healthData.healthReport.details.templateSync.detected) * 100 
                        : 100} 
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Inventory Items</span>
                      <span>{healthData.healthReport.details.missingInventory.created} created</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Product Catalog Sync</span>
                      <span>{healthData.healthReport.details.catalogSync.updated} updated</span>
                    </div>
                    <Progress value={90} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="realtime">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Real-time Availability Status
              </h3>
              <Button 
                onClick={refreshAvailability} 
                disabled={loading}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {healthData?.availabilityStatus && (
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Available Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {healthData.availabilityStatus.summary.availableCount}
                    </div>
                    <div className="space-y-2">
                      {healthData.availabilityStatus.available.slice(0, 5).map((product: any) => (
                        <div key={product.id} className="flex justify-between text-sm">
                          <span>{product.name}</span>
                          <Badge variant="secondary">Max: {product.maxQuantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Unavailable Products
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-2">
                      {healthData.availabilityStatus.summary.unavailableCount}
                    </div>
                    <div className="space-y-2">
                      {healthData.availabilityStatus.unavailable.slice(0, 5).map((product: any) => (
                        <div key={product.id} className="space-y-1">
                          <div className="text-sm font-medium">{product.name}</div>
                          <div className="text-xs text-muted-foreground">{product.reason}</div>
                          <Badge variant="outline" className="text-xs">
                            ETA: {product.estimatedRestockTime}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="predictive">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Predictive Analytics
              </h3>
              <Button 
                onClick={triggerPredictiveReordering} 
                disabled={predictiveLoading || !storeId}
                size="sm"
              >
                <Truck className={`h-4 w-4 mr-2 ${predictiveLoading ? 'animate-spin' : ''}`} />
                Trigger Reordering
              </Button>
            </div>

            {healthData?.forecastData && (
              <div className="grid gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Forecast Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {healthData.forecastData.summary.totalIngredients}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Ingredients</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {healthData.forecastData.summary.criticalItems}
                        </div>
                        <div className="text-sm text-muted-foreground">Critical Items</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {healthData.forecastData.summary.reorderRecommendations}
                        </div>
                        <div className="text-sm text-muted-foreground">Reorder Needed</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Critical Forecasts</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {healthData.forecastData.forecasts
                        .filter((item: any) => item.daysUntilEmpty < 7)
                        .slice(0, 10)
                        .map((item: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded">
                            <div>
                              <div className="font-medium">{item.ingredient}</div>
                              <div className="text-sm text-muted-foreground">
                                Current: {item.currentStock} | 
                                Usage: {item.predictedUsage}/week
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge variant={item.daysUntilEmpty < 1 ? "destructive" : 
                                item.daysUntilEmpty < 3 ? "secondary" : "outline"}>
                                {item.daysUntilEmpty} days left
                              </Badge>
                              <div className="text-xs text-muted-foreground mt-1">
                                {Math.round(item.confidence * 100)}% confidence
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="validation">
          {healthData?.validationSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Product Validation Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {healthData.validationSummary.sellable}
                    </div>
                    <div className="text-sm text-muted-foreground">Sellable Products</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {healthData.validationSummary.missingRecipes}
                    </div>
                    <div className="text-sm text-muted-foreground">Missing Recipes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {healthData.validationSummary.insufficientStock}
                    </div>
                    <div className="text-sm text-muted-foreground">Insufficient Stock</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {healthData.validationSummary.missingIngredients}
                    </div>
                    <div className="text-sm text-muted-foreground">Missing Ingredients</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details">
          {healthData?.healthReport && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>System Health Details</AlertTitle>
                <AlertDescription>
                  Detailed breakdown of system repairs and issues detected during the last health check.
                </AlertDescription>
              </Alert>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Template Synchronization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Detected drift:</span>
                        <Badge variant="outline">{healthData.healthReport.details.templateSync.detected}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Repaired:</span>
                        <Badge variant="default">{healthData.healthReport.details.templateSync.repaired}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Failed:</span>
                        <Badge variant="destructive">{healthData.healthReport.details.templateSync.failed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Missing Inventory</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Items created:</span>
                        <Badge variant="default">{healthData.healthReport.details.missingInventory.created}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Creation failed:</span>
                        <Badge variant="destructive">{healthData.healthReport.details.missingInventory.failed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Orphaned Recipes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Recipes linked:</span>
                        <Badge variant="default">{healthData.healthReport.details.orphanedRecipes.linked}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Link failed:</span>
                        <Badge variant="destructive">{healthData.healthReport.details.orphanedRecipes.failed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Catalog Synchronization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Products updated:</span>
                        <Badge variant="default">{healthData.healthReport.details.catalogSync.updated}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Update failed:</span>
                        <Badge variant="destructive">{healthData.healthReport.details.catalogSync.failed}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SystemHealthDashboard;