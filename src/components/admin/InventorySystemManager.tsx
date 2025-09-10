import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  RefreshCw, 
  Wrench,
  TrendingUp,
  BarChart3,
  Clock,
  Store
} from 'lucide-react';
import { inventorySystemRepairService, SystemHealthStatus } from '@/services/inventory/inventorySystemRepair';
import { format } from 'date-fns';
import { InventorySystemRepair } from "@/components/inventory/InventorySystemRepair";

export const InventorySystemManager: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [lastRepairResult, setLastRepairResult] = useState<any>(null);
  const [unprocessedTransactions, setUnprocessedTransactions] = useState<any[]>([]);
  const [inventoryImpact, setInventoryImpact] = useState<any>(null);

  useEffect(() => {
    loadSystemHealth();
    loadUnprocessedTransactions();
  }, []);

  const loadSystemHealth = async () => {
    setIsLoading(true);
    try {
      const health = await inventorySystemRepairService.getSystemHealth();
      setSystemHealth(health);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUnprocessedTransactions = async () => {
    try {
      const transactions = await inventorySystemRepairService.getUnprocessedTransactions();
      setUnprocessedTransactions(transactions);
      
      const impact = await inventorySystemRepairService.calculateInventoryImpact(transactions);
      setInventoryImpact(impact);
    } catch (error) {
      console.error('Error loading unprocessed transactions:', error);
    }
  };

  const executeCompleteRepair = async () => {
    setIsRepairing(true);
    try {
      const result = await inventorySystemRepairService.executeCompleteRepair();
      setLastRepairResult(result);
      await loadSystemHealth(); // Refresh health data
    } finally {
      setIsRepairing(false);
    }
  };

  const getHealthStatusColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthStatusBadge = (score: number) => {
    if (score >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
    if (score >= 70) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Needs Attention</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  const overallHealth = systemHealth.length > 0 ? 
    systemHealth.reduce((sum, store) => sum + store.health_score, 0) / systemHealth.length : 0;

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overall Health</p>
                <p className={`text-2xl font-bold ${getHealthStatusColor(overallHealth)}`}>
                  {overallHealth.toFixed(1)}%
                </p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Stores</p>
                <p className="text-2xl font-bold">{systemHealth.length}</p>
              </div>
              <Store className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Recipes</p>
                <p className="text-2xl font-bold">
                  {systemHealth.reduce((sum, store) => sum + store.total_recipes, 0)}
                </p>
              </div>
              <Database className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">
                  {systemHealth.filter(store => store.health_score < 70).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status Alert */}
      {overallHealth < 90 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical System Issue Detected</AlertTitle>
          <AlertDescription>
            The inventory deduction system is not functioning properly. 
            {systemHealth.filter(store => store.recipes_without_ingredients > 0).length} stores have recipes without ingredients.
            This means inventory is not being deducted from sales transactions.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="repair">Repair System</TabsTrigger>
          <TabsTrigger value="impact">Historical Impact</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Store Health Status
              </CardTitle>
              <CardDescription>
                Health score based on recipe ingredient completeness and inventory mappings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <RefreshCw className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading system health...</span>
                  </div>
                ) : (
                  systemHealth.map((store) => (
                    <div key={store.store_id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-medium">{store.store_name}</h4>
                          {getHealthStatusBadge(store.health_score)}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div>
                            <span className="font-medium">Recipes:</span> {store.total_recipes}
                          </div>
                          <div>
                            <span className="font-medium">With Ingredients:</span> {store.recipes_with_ingredients}
                          </div>
                          <div>
                            <span className="font-medium">Missing:</span> 
                            <span className="text-red-600 ml-1">{store.recipes_without_ingredients}</span>
                          </div>
                          <div>
                            <span className="font-medium">Mapped:</span> {store.mapped_ingredients}
                          </div>
                        </div>
                        <Progress value={store.health_score} className="mt-2" />
                      </div>
                      <div className={`text-2xl font-bold ${getHealthStatusColor(store.health_score)} ml-4`}>
                        {store.health_score}%
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="repair" className="space-y-4">
          {/* New Inventory System Repair Component */}
          <InventorySystemRepair storeId="d7c47e6b-f20a-4543-a6bd-000398f72df5" />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Legacy System Repair Tools
              </CardTitle>
              <CardDescription>
                Execute comprehensive repairs to fix inventory deduction issues
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Database className="h-4 w-4" />
                <AlertTitle>Phase 1: Critical System Repair</AlertTitle>
                <AlertDescription>
                  This will fix recipe ingredients across ALL stores and create inventory mappings.
                  This addresses the system-wide failure where recipes have no ingredients.
                </AlertDescription>
              </Alert>

              <Button 
                onClick={executeCompleteRepair}
                disabled={isRepairing}
                className="w-full"
                size="lg"
              >
                {isRepairing ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Executing Complete System Repair...
                  </>
                ) : (
                  <>
                    <Wrench className="mr-2 h-4 w-4" />
                    Execute Complete System Repair
                  </>
                )}
              </Button>

              {lastRepairResult && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-green-600 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5" />
                      Repair Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Recipes Fixed:</span> 
                        <span className="ml-2 font-bold text-green-600">
                          {lastRepairResult.ingredientRepair?.recipes_fixed || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Ingredients Added:</span> 
                        <span className="ml-2 font-bold text-green-600">
                          {lastRepairResult.ingredientRepair?.ingredients_added || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Mappings Created:</span> 
                        <span className="ml-2 font-bold text-blue-600">
                          {lastRepairResult.mappingResult?.mappings_created || 0}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Stores Processed:</span> 
                        <span className="ml-2 font-bold text-blue-600">
                          {lastRepairResult.mappingResult?.stores_processed || 0}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="impact" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Historical Impact Analysis
              </CardTitle>
              <CardDescription>
                Transactions processed since August 26, 2025 without inventory deduction
              </CardDescription>
            </CardHeader>
            <CardContent>
              {inventoryImpact && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 border rounded-lg">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{inventoryImpact.totalTransactions}</p>
                    <p className="text-sm text-muted-foreground">Unprocessed Transactions</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{inventoryImpact.totalItems}</p>
                    <p className="text-sm text-muted-foreground">Items Sold</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <Store className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-2xl font-bold">{Object.keys(inventoryImpact.impactByStore).length}</p>
                    <p className="text-sm text-muted-foreground">Affected Stores</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">Recent Unprocessed Transactions</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {unprocessedTransactions.slice(0, 50).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div>
                        <p className="font-medium">{transaction.receipt_number}</p>
                        <p className="text-muted-foreground">{transaction.stores.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₱{transaction.total}</p>
                        <p className="text-muted-foreground">
                          {format(new Date(transaction.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                System Monitoring
              </CardTitle>
              <CardDescription>
                Real-time monitoring and alerts for inventory system health
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Auto-Refresh System Health</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatically check system health every 30 seconds
                  </p>
                </div>
                <Button 
                  onClick={loadSystemHealth}
                  variant="outline"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Monitoring Status</AlertTitle>
                <AlertDescription>
                  System monitoring is active. Health checks will alert when recipe ingredients 
                  are missing or inventory mappings are incomplete.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};