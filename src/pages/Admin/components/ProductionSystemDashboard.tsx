import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TestTube, 
  Database, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Activity,
  TrendingUp,
  Settings,
  Loader
} from 'lucide-react';
import { toast } from 'sonner';
import { useStore } from '@/contexts/StoreContext';
import { 
  ProductionTestingService, 
  SystemTestReport, 
  runQuickHealthCheck 
} from '@/services/testing/productionTestingService';
import { cleanupDuplicateRecipes } from '@/services/recipeManagement/recipeDeploymentService';

export const ProductionSystemDashboard: React.FC = () => {
  const { currentStore } = useStore();
  const [testReport, setTestReport] = useState<SystemTestReport | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [isRunningCleanup, setIsRunningCleanup] = useState(false);
  const [systemHealth, setSystemHealth] = useState<'unknown' | 'healthy' | 'issues' | 'critical'>('unknown');

  useEffect(() => {
    if (currentStore) {
      runQuickHealthCheck(currentStore.id).then(healthy => {
        setSystemHealth(healthy ? 'healthy' : 'issues');
      });
    }
  }, [currentStore]);

  const runFullSystemTest = async () => {
    if (!currentStore) {
      toast.error('Please select a store first');
      return;
    }

    setIsRunningTests(true);
    try {
      const testService = new ProductionTestingService();
      const report = await testService.runCompleteSystemTest(currentStore.id);
      setTestReport(report);
      setSystemHealth(report.overallPassed ? 'healthy' : 'issues');
      
      if (report.overallPassed) {
        toast.success('All system tests passed! 🎉');
      } else {
        toast.warning(`${report.failedTests} tests failed. Check the report for details.`);
      }
    } catch (error) {
      console.error('Test execution failed:', error);
      toast.error('Failed to run system tests');
      setSystemHealth('critical');
    } finally {
      setIsRunningTests(false);
    }
  };

  const runSystemCleanup = async () => {
    if (!currentStore) {
      toast.error('Please select a store first');
      return;
    }

    setIsRunningCleanup(true);
    try {
      const deletedCount = await cleanupDuplicateRecipes(currentStore.id);
      if (deletedCount > 0) {
        toast.success(`Cleaned up ${deletedCount} duplicate recipes`);
      } else {
        toast.info('No duplicate recipes found');
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
      toast.error('Failed to run system cleanup');
    } finally {
      setIsRunningCleanup(false);
    }
  };

  const getHealthBadge = () => {
    switch (systemHealth) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'issues':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Issues Detected</Badge>;
      case 'critical':
        return <Badge variant="destructive">Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getHealthIcon = () => {
    switch (systemHealth) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'issues':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">System Health</p>
              <div className="flex items-center mt-2">
                {getHealthIcon()}
                <span className="ml-2">{getHealthBadge()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tests Passed</p>
              <p className="text-2xl font-bold">
                {testReport ? `${testReport.passedTests}/${testReport.totalTests}` : '-'}
              </p>
            </div>
            <TestTube className="h-8 w-8 text-blue-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Performance</p>
              <p className="text-2xl font-bold">
                {testReport ? `${testReport.duration}ms` : '-'}
              </p>
            </div>
            <Zap className="h-8 w-8 text-yellow-600" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Current Store</p>
              <p className="text-sm font-medium truncate">
                {currentStore?.name || 'No store selected'}
              </p>
            </div>
            <Database className="h-8 w-8 text-purple-600" />
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            System Management
          </CardTitle>
          <CardDescription>
            Run diagnostics and maintenance tasks for the production management system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={runFullSystemTest} 
              disabled={isRunningTests || !currentStore}
              className="min-w-32"
            >
              {isRunningTests ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube className="h-4 w-4 mr-2" />
                  Run Full Test
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={runSystemCleanup} 
              disabled={isRunningCleanup || !currentStore}
            >
              {isRunningCleanup ? (
                <>
                  <Loader className="h-4 w-4 mr-2 animate-spin" />
                  Cleaning...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  System Cleanup
                </>
              )}
            </Button>

            <Button 
              variant="outline"
              onClick={() => currentStore && runQuickHealthCheck(currentStore.id)}
              disabled={!currentStore}
            >
              <Activity className="h-4 w-4 mr-2" />
              Quick Health Check
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testReport && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Test Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed Results</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Test Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>Overall Status</span>
                    {testReport.overallPassed ? (
                      <Badge className="bg-green-100 text-green-800">All Tests Passed</Badge>
                    ) : (
                      <Badge variant="destructive">Some Tests Failed</Badge>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span>{testReport.passedTests}/{testReport.totalTests} tests passed</span>
                    </div>
                    <Progress 
                      value={(testReport.passedTests / testReport.totalTests) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Duration:</span>
                      <div className="font-medium">{testReport.duration}ms</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Failed Tests:</span>
                      <div className="font-medium">{testReport.failedTests}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Test Results Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {testReport.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        result.passed 
                          ? 'border-green-200 bg-green-50' 
                          : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.passed ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-medium">{result.testName}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {result.duration}ms
                        </span>
                      </div>
                      <p className="text-sm mt-1">{result.message}</p>
                      {result.details && (
                        <pre className="text-xs mt-2 p-2 bg-white rounded border overflow-x-auto">
                          {JSON.stringify(result.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations">
            <Card>
              <CardHeader>
                <CardTitle>System Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {testReport.recommendations.length > 0 ? (
                  <div className="space-y-3">
                    {testReport.recommendations.map((recommendation, index) => (
                      <Alert key={index}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{recommendation}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>
                      🎉 No recommendations needed! Your system is running optimally.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!currentStore && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Please select a store to run system diagnostics and tests.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};