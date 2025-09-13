/**
 * UNIFIED INVENTORY DASHBOARD
 * 
 * Single interface consolidating all inventory system administration:
 * - Health monitoring
 * - System repair
 * - Testing and validation
 * - Performance metrics
 */

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
  Store,
  Shield,
  Zap,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { UnifiedHealthService, UnifiedHealthReport, RepairResult } from '@/services/unified/UnifiedHealthService';
import { UnifiedInventoryService } from '@/services/unified/UnifiedInventoryService';

export const UnifiedInventoryDashboard: React.FC = () => {
  const [healthReport, setHealthReport] = useState<UnifiedHealthReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [lastRepairResult, setLastRepairResult] = useState<RepairResult | null>(null);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    loadHealthReport();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadHealthReport, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadHealthReport = async () => {
    setIsLoading(true);
    try {
      const report = await UnifiedHealthService.runCompleteHealthCheck();
      setHealthReport(report);
    } catch (error) {
      console.error('Failed to load health report:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const executeSystemRepair = async () => {
    setIsRepairing(true);
    try {
      const result = await UnifiedHealthService.executeSystemRepair();
      setLastRepairResult(result);
      
      // Refresh health report after repair
      setTimeout(() => {
        loadHealthReport();
      }, 2000);
    } finally {
      setIsRepairing(false);
    }
  };

  const runSystemTest = async () => {
    setIsTesting(true);
    setTestResult('');
    
    try {
      console.log('🧪 UNIFIED TEST: Starting system test');
      
      // Create test transaction
      const testItems = [{
        productId: 'test-product-id',
        productName: 'Test Croissant',
        quantity: 1,
        storeId: 'd7c47e6b-f20a-4543-a6bd-000398f72df5' // Replace with actual store ID
      }];

      const result = await UnifiedInventoryService.processTransaction(
        `test-${Date.now()}`,
        'd7c47e6b-f20a-4543-a6bd-000398f72df5',
        testItems
      );
      
      if (result.success) {
        setTestResult('✅ UNIFIED SYSTEM TEST PASSED - Inventory processing is working correctly');
      } else {
        setTestResult(`❌ UNIFIED SYSTEM TEST FAILED: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult(`❌ UNIFIED SYSTEM TEST ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'degraded': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string, score: number) => {
    switch (status) {
      case 'healthy': return <Badge variant="default" className="bg-green-100 text-green-800">Healthy ({score}%)</Badge>;
      case 'degraded': return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Degraded ({score}%)</Badge>;
      case 'critical': return <Badge variant="destructive">Critical ({score}%)</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const renderOverviewMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Health</p>
              <p className={`text-2xl font-bold ${getStatusColor(healthReport?.overall.status || 'unknown')}`}>
                {healthReport?.overall.score || 0}%
              </p>
            </div>
            <Shield className="h-8 w-8 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Stores</p>
              <p className="text-2xl font-bold">{healthReport?.stores.length || 0}</p>
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
              <p className="text-2xl font-bold">{healthReport?.systemMetrics.totalRecipes || 0}</p>
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
                {healthReport?.issues.filter(issue => issue.type === 'critical').length || 0}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStoreHealth = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Store Health Status
        </CardTitle>
        <CardDescription>
          Unified health monitoring for all store inventory systems
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading unified health status...</span>
            </div>
          ) : (
            healthReport?.stores.map((store) => (
              <div key={store.storeId} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">{store.storeName}</h4>
                    {getStatusBadge(store.status, store.score)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                    <div>
                      <span className="font-medium">Recipes:</span> {store.metrics.totalRecipes}
                    </div>
                    <div>
                      <span className="font-medium">With Ingredients:</span> {store.metrics.recipesWithIngredients}
                    </div>
                    <div>
                      <span className="font-medium">Missing:</span>
                      <span className="text-red-600 ml-1">{store.metrics.recipesWithoutIngredients}</span>
                    </div>
                    <div>
                      <span className="font-medium">Inventory Items:</span> {store.metrics.inventoryItems}
                    </div>
                  </div>
                  <Progress value={store.score} className="mt-2" />
                  {store.issues.length > 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      Issues: {store.issues.join(', ')}
                    </div>
                  )}
                </div>
                <div className={`text-2xl font-bold ${getStatusColor(store.status)} ml-4`}>
                  {store.score}%
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSystemRepair = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Unified System Repair
        </CardTitle>
        <CardDescription>
          Comprehensive repair for all inventory system issues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthReport?.overall.status === 'critical' && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>🚨 CRITICAL SYSTEM ISSUES DETECTED</AlertTitle>
            <AlertDescription>
              The inventory system has critical issues that require immediate attention.
              Execute system repair to fix recipe ingredients, create mappings, and restore functionality.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Button 
            onClick={executeSystemRepair}
            disabled={isRepairing}
            size="lg"
            variant={healthReport?.overall.status === 'critical' ? 'destructive' : 'default'}
          >
            {isRepairing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Executing Repair...
              </>
            ) : (
              <>
                <Wrench className="mr-2 h-4 w-4" />
                Execute System Repair
              </>
            )}
          </Button>

          <Button 
            onClick={runSystemTest}
            disabled={isTesting}
            size="lg"
            variant="outline"
          >
            {isTesting ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Zap className="mr-2 h-4 w-4" />
                Run System Test
              </>
            )}
          </Button>
        </div>

        {testResult && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Test Results</AlertTitle>
            <AlertDescription>{testResult}</AlertDescription>
          </Alert>
        )}

        {lastRepairResult && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Last Repair Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Recipes Fixed:</span>
                  <span className="ml-2 font-bold text-green-600">{lastRepairResult.recipesFixed}</span>
                </div>
                <div>
                  <span className="font-medium">Ingredients Added:</span>
                  <span className="ml-2 font-bold text-green-600">{lastRepairResult.ingredientsAdded}</span>
                </div>
                <div>
                  <span className="font-medium">Mappings Created:</span>
                  <span className="ml-2 font-bold text-blue-600">{lastRepairResult.mappingsCreated}</span>
                </div>
                <div>
                  <span className="font-medium">Stores Processed:</span>
                  <span className="ml-2 font-bold text-blue-600">{lastRepairResult.storesProcessed}</span>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Execution Time: {lastRepairResult.executionTimeMs}ms
              </div>
              {lastRepairResult.errors.length > 0 && (
                <div className="mt-2 text-sm text-red-600">
                  Errors: {lastRepairResult.errors.join(', ')}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );

  const renderSystemIssues = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          System Issues & Recommendations
        </CardTitle>
        <CardDescription>
          Identified issues and automated recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {healthReport?.issues.length === 0 ? (
            <div className="text-center py-8 text-green-600">
              <CheckCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">No Issues Detected</p>
              <p className="text-sm text-muted-foreground">System is operating normally</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h4 className="font-medium">Critical & Warning Issues:</h4>
                {healthReport?.issues.map((issue, index) => (
                  <Alert key={index} variant={issue.type === 'critical' ? 'destructive' : 'default'}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>{issue.title}</AlertTitle>
                    <AlertDescription>
                      {issue.description}
                      {issue.recommendation && (
                        <div className="mt-1 text-xs">
                          <strong>Recommendation:</strong> {issue.recommendation}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                ))}
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Automated Recommendations:</h4>
                <div className="space-y-1">
                  {healthReport?.recommendations.map((recommendation, index) => (
                    <div key={index} className="text-sm p-2 bg-blue-50 border border-blue-200 rounded">
                      {recommendation}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const renderSystemMetrics = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          System Performance Metrics
        </CardTitle>
        <CardDescription>
          Real-time system performance and health metrics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-4">Recipe System</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Total Recipes</span>
                <span className="font-medium">{healthReport?.systemMetrics.totalRecipes || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">With Ingredients</span>
                <span className="font-medium text-green-600">{healthReport?.systemMetrics.recipesWithIngredients || 0}</span>
              </div>
              <Progress 
                value={healthReport?.systemMetrics.totalRecipes ? 
                  (healthReport.systemMetrics.recipesWithIngredients / healthReport.systemMetrics.totalRecipes) * 100 : 0
                } 
              />
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-4">Transaction Health</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Recent Transactions (24h)</span>
                <span className="font-medium">{healthReport?.systemMetrics.recentTransactions || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Failed Transactions</span>
                <span className="font-medium text-red-600">{healthReport?.systemMetrics.failedTransactions || 0}</span>
              </div>
              <Progress 
                value={healthReport?.systemMetrics.recentTransactions ? 
                  ((healthReport.systemMetrics.recentTransactions - (healthReport.systemMetrics.failedTransactions || 0)) / 
                   healthReport.systemMetrics.recentTransactions) * 100 : 100
                } 
              />
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Last Health Check:</span>
              <span className="ml-2 font-medium">
                {healthReport?.overall.lastCheck ? format(healthReport.overall.lastCheck, 'PPpp') : 'Never'}
              </span>
            </div>
            <Button 
              onClick={loadHealthReport}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* System Status Alert */}
      {healthReport?.overall.status === 'critical' && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>🚨 CRITICAL SYSTEM ALERT</AlertTitle>
          <AlertDescription>
            The unified inventory system has critical issues requiring immediate attention.
            System health score: {healthReport.overall.score}%. Execute system repair immediately.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Metrics */}
      {renderOverviewMetrics()}

      {/* Tabbed Interface */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="repair">Repair & Test</TabsTrigger>
          <TabsTrigger value="issues">Issues & Alerts</TabsTrigger>
          <TabsTrigger value="metrics">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-4">
          {renderStoreHealth()}
        </TabsContent>

        <TabsContent value="repair" className="space-y-4">
          {renderSystemRepair()}
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          {renderSystemIssues()}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {renderSystemMetrics()}
        </TabsContent>
      </Tabs>
    </div>
  );
};