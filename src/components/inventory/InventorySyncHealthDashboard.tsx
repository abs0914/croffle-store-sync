import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useInventorySyncHealth } from '@/hooks/useInventorySyncHealth';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Settings, 
  TrendingUp, 
  TrendingDown,
  Wrench,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface InventorySyncHealthDashboardProps {
  storeId?: string;
  className?: string;
}

export const InventorySyncHealthDashboard: React.FC<InventorySyncHealthDashboardProps> = ({
  storeId,
  className = ''
}) => {
  const {
    globalHealth,
    isLoading,
    error,
    averageHealth,
    criticalStores,
    autoRepairInProgress,
    realTimeEnabled,
    isHealthy,
    needsAttention,
    refreshHealth,
    attemptRepair,
    toggleRealTimeMonitoring,
    getSyncReport,
    scheduleMonitoring,
    realTimeQueueStatus
  } = useInventorySyncHealth(storeId);

  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [autoRepairResults, setAutoRepairResults] = useState<any>(null);

  // Handle auto-repair
  const handleAutoRepair = async (targetStoreId: string) => {
    try {
      const result = await attemptRepair(targetStoreId);
      setAutoRepairResults(result);
      
      if (result && result.repairsSuccessful > 0) {
        toast.success(`Auto-repair completed: ${result.repairsSuccessful} issues fixed`);
      } else {
        toast.warning('Auto-repair completed but no issues were resolved');
      }
    } catch (error) {
      toast.error('Auto-repair failed');
    }
  };

  // Handle real-time monitoring toggle
  const handleRealTimeToggle = (enabled: boolean) => {
    toggleRealTimeMonitoring(enabled);
    
    if (enabled) {
      toast.success('Real-time monitoring enabled');
    } else {
      toast.info('Real-time monitoring disabled');
    }
  };

  // Get health color based on percentage
  const getHealthColor = (health: number) => {
    if (health >= 90) return 'text-green-600';
    if (health >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get health status badge
  const getHealthBadge = (health: number) => {
    if (health >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
    if (health >= 70) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Warning</Badge>;
    return <Badge variant="destructive">Critical</Badge>;
  };

  // Get trend icon
  const getTrendIcon = (store: any) => {
    if (store.trends.improving) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (store.trends.deteriorating) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-400" />;
  };

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Sync Health Monitor</h2>
          <p className="text-muted-foreground">Phase 2 - Advanced monitoring and auto-repair system</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Real-time monitoring toggle */}
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="text-sm">Real-time</span>
            <Switch
              checked={realTimeEnabled}
              onCheckedChange={handleRealTimeToggle}
            />
          </div>
          
          <Button 
            onClick={refreshHealth} 
            disabled={isLoading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Health Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(averageHealth)}`}>
                  {averageHealth}%
                </p>
              </div>
              {isHealthy ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-600" />
              )}
            </div>
            <Progress value={averageHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stores</p>
                <p className="text-2xl font-bold">{globalHealth.length}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Issues</p>
                <p className="text-2xl font-bold text-red-600">{criticalStores.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Auto Repair</p>
                <p className="text-sm">
                  {autoRepairInProgress ? (
                    <span className="text-yellow-600">Running...</span>
                  ) : (
                    <span className="text-green-600">Ready</span>
                  )}
                </p>
              </div>
              <Wrench className={`h-8 w-8 ${autoRepairInProgress ? 'text-yellow-600 animate-pulse' : 'text-green-600'}`} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Status */}
      {realTimeEnabled && realTimeQueueStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Real-time Monitoring Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Queue Length:</span>
                <span className="ml-2 font-medium">{realTimeQueueStatus.queueLength}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Processing:</span>
                <span className="ml-2">
                  {realTimeQueueStatus.isProcessing ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Idle</Badge>
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Subscriptions:</span>
                <span className="ml-2 font-medium">{realTimeQueueStatus.activeSubscriptions}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Recent Events:</span>
                <span className="ml-2 font-medium">{realTimeQueueStatus.recentEvents.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical Issues Alert */}
      {needsAttention && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {criticalStores.length} store(s) have critical inventory sync issues that need immediate attention.
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2"
              onClick={() => {
                criticalStores.forEach(store => handleAutoRepair(store.storeId));
              }}
              disabled={autoRepairInProgress}
            >
              <Wrench className="h-4 w-4 mr-1" />
              Auto-Repair All
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Store Details Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="details">Store Details</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {globalHealth.map((store) => (
              <Card key={store.storeId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{store.storeName}</CardTitle>
                    {getTrendIcon(store)}
                  </div>
                  <div className="flex items-center gap-2">
                    {getHealthBadge(store.syncHealthPercentage)}
                    <span className={`text-sm font-medium ${getHealthColor(store.syncHealthPercentage)}`}>
                      {store.syncHealthPercentage}%
                    </span>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Progress value={store.syncHealthPercentage} className="mb-3" />
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Products:</span>
                      <span className="font-medium">{store.totalProducts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valid:</span>
                      <span className="font-medium text-green-600">{store.validProducts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Invalid:</span>
                      <span className="font-medium text-red-600">{store.invalidProducts}</span>
                    </div>
                  </div>

                  {store.criticalIssues.length > 0 && (
                    <div className="mt-3 p-2 bg-red-50 rounded-md">
                      <p className="text-xs text-red-800 font-medium">Critical Issues:</p>
                      <p className="text-xs text-red-700">{store.criticalIssues.length} items need attention</p>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAutoRepair(store.storeId)}
                      disabled={autoRepairInProgress}
                      className="flex-1"
                    >
                      <Wrench className="h-3 w-3 mr-1" />
                      Auto-Repair
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {selectedStore ? (
            <div>
              {/* Store detail view would go here */}
              <p>Detailed view for store: {selectedStore}</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center">
                  Select a store from the overview to view detailed information
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Health Report</CardTitle>
              <CardDescription>Comprehensive analysis of inventory sync status</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => {
                const report = getSyncReport();
                console.log('Sync Report:', report);
                toast.success('Report generated - check console for details');
              }}>
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Monitoring Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Schedule Automatic Monitoring</p>
                  <p className="text-sm text-muted-foreground">
                    Run proactive monitoring every 30 minutes
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => scheduleMonitoring(30)}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Auto-repair Results Modal/Panel */}
      {autoRepairResults && (
        <Card>
          <CardHeader>
            <CardTitle>Auto-Repair Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>Repairs Attempted: {autoRepairResults.repairsAttempted}</p>
              <p>Successful: {autoRepairResults.repairsSuccessful}</p>
              <p>Failed: {autoRepairResults.repairsFailed}</p>
              
              {autoRepairResults.repairLog.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-medium">Repair Log:</h4>
                  <div className="space-y-1 text-sm">
                    {autoRepairResults.repairLog.slice(0, 5).map((log: any, index: number) => (
                      <div key={index} className={log.success ? 'text-green-600' : 'text-red-600'}>
                        {log.productName}: {log.repairAction} - {log.success ? 'Success' : 'Failed'}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setAutoRepairResults(null)}
                className="mt-2"
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};