import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePhase3Analytics } from '@/hooks/usePhase3Analytics';
import { workflowAutomationEngine } from '@/services/inventory/workflowAutomationEngine';
import { multiStoreOrchestrator } from '@/services/inventory/multiStoreOrchestrator';
import {
  Brain,
  Zap,
  Network,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Play,
  Pause,
  BarChart3,
  Users,
  Clock,
  Target,
  Sparkles,
  Workflow,
  Globe,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export const Phase3Dashboard: React.FC = () => {
  const {
    syncTrends,
    predictiveInsights,
    performanceMetrics,
    automationRules,
    activeExecutions,
    storeClusters,
    activeSyncs,
    storeHealthScores,
    overallHealth,
    criticalInsights,
    activeAutomationCount,
    isLoading,
    refreshAll,
    toggleAutomationRule,
    executeAutomationRule,
    startCrossStoreSync
  } = usePhase3Analytics();

  useEffect(() => {
    // Initialize Phase 3 engines
    const initializePhase3 = async () => {
      try {
        await workflowAutomationEngine.initialize();
        await multiStoreOrchestrator.initialize();
      } catch (error) {
        console.error('Failed to initialize Phase 3:', error);
      }
    };

    initializePhase3();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 0.9) return 'text-green-600';
    if (health >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">Phase 3: Advanced Intelligence</h1>
          <p className="text-muted-foreground">
            AI-powered analytics, automation, and multi-store orchestration
          </p>
        </div>
        <Button onClick={refreshAll} disabled={isLoading}>
          <Activity className="h-4 w-4 mr-2" />
          {isLoading ? 'Refreshing...' : 'Refresh All'}
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-md">
                <Brain className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Overall Health</p>
                <p className={`text-2xl font-bold ${getHealthColor(overallHealth)}`}>
                  {Math.round(overallHealth * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-md">
                <Sparkles className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Critical Insights</p>
                <p className="text-2xl font-bold text-red-600">
                  {criticalInsights.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-md">
                <Workflow className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Active Automation</p>
                <p className="text-2xl font-bold text-green-600">
                  {activeAutomationCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-md">
                <Globe className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-sm">Store Clusters</p>
                <p className="text-2xl font-bold text-orange-600">
                  {storeClusters.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="orchestration">Orchestration</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sync Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Sync Success Trends
                </CardTitle>
                <CardDescription>30-day sync performance history</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={syncTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="successRate" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>Real-time system performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Average Sync Time</span>
                    <span>{Math.round(performanceMetrics.avgSyncTime)}ms</span>
                  </div>
                  <Progress value={Math.min(100, (performanceMetrics.avgSyncTime / 10000) * 100)} />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Resource Utilization</span>
                    <span>{Math.round(performanceMetrics.resourceUtilization)}%</span>
                  </div>
                  <Progress value={performanceMetrics.resourceUtilization} />
                </div>

                <div>
                  <h4 className="font-medium text-sm mb-2">Peak Hours</h4>
                  <div className="flex flex-wrap gap-1">
                    {performanceMetrics.peakHours.map(hour => (
                      <Badge key={hour} variant="secondary" className="text-xs">
                        {hour}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Patterns */}
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {performanceMetrics.errorPatterns.map((pattern, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{pattern.pattern}</p>
                      <p className="text-sm text-muted-foreground">
                        Last occurred: {new Date(pattern.lastOccurrence).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="destructive">{pattern.frequency}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Automation Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Automation Rules
                </CardTitle>
                <CardDescription>Manage automated workflows</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {automationRules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Priority: {rule.priority} | Cooldown: {rule.cooldownMinutes}m
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={rule.isActive ? "default" : "secondary"}>
                        {rule.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAutomationRule(rule.id, !rule.isActive)}
                      >
                        {rule.isActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => executeAutomationRule(rule.id)}
                        disabled={!rule.isActive}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Active Executions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Active Executions
                </CardTitle>
                <CardDescription>Currently running workflows</CardDescription>
              </CardHeader>
              <CardContent>
                {activeExecutions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No active executions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {activeExecutions.map((execution) => (
                      <div key={execution.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium">Rule: {execution.ruleId}</p>
                          <Badge variant={
                            execution.status === 'running' ? 'default' :
                            execution.status === 'completed' ? 'secondary' :
                            'destructive'
                          }>
                            {execution.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Started: {new Date(execution.startTime).toLocaleString()}
                        </p>
                        <p className="text-sm">
                          Results: {execution.results.length} actions executed
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Orchestration Tab */}
        <TabsContent value="orchestration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Store Clusters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Store Clusters
                </CardTitle>
                <CardDescription>Multi-store management groups</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {storeClusters.map((cluster) => (
                  <div key={cluster.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{cluster.name}</p>
                      <Badge variant="outline">{cluster.storeIds.length} stores</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Strategy: {cluster.syncStrategy}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => startCrossStoreSync(cluster.id)}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Store Health Scores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Store Health Scores
                </CardTitle>
                <CardDescription>Individual store performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Array.from(storeHealthScores.entries()).map(([storeId, health]) => (
                  <div key={storeId} className="flex items-center justify-between p-2">
                    <p className="text-sm font-medium">Store {storeId.slice(0, 8)}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={health * 100} className="w-20" />
                      <span className={`text-sm font-medium ${getHealthColor(health)}`}>
                        {Math.round(health * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Active Cross-Store Syncs */}
          <Card>
            <CardHeader>
              <CardTitle>Active Cross-Store Syncs</CardTitle>
            </CardHeader>
            <CardContent>
              {activeSyncs.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  No active cross-store syncs
                </p>
              ) : (
                <div className="space-y-3">
                  {activeSyncs.map((sync) => (
                    <div key={sync.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium">Cluster: {sync.clusterId}</p>
                        <Badge variant={
                          sync.status === 'running' ? 'default' :
                          sync.status === 'completed' ? 'secondary' :
                          sync.status === 'partial' ? 'outline' :
                          'destructive'
                        }>
                          {sync.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p>Success: {sync.overallMetrics.successfulStores}/{sync.overallMetrics.totalStores}</p>
                          <p>Items: {sync.overallMetrics.totalItemsProcessed}</p>
                        </div>
                        <div>
                          <p>Duration: {Math.round(sync.overallMetrics.totalDuration / 1000)}s</p>
                          <p>Avg: {Math.round(sync.overallMetrics.averageStoreTime / 1000)}s</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Predictive Insights
              </CardTitle>
              <CardDescription>AI-powered recommendations and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              {predictiveInsights.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">All systems optimal</p>
                  <p className="text-muted-foreground">No issues detected by AI analysis</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {predictiveInsights.map((insight, index) => (
                    <Card key={index} className="border-l-4" style={{
                      borderLeftColor: insight.severity === 'critical' ? '#ef4444' :
                                     insight.severity === 'high' ? '#f97316' :
                                     insight.severity === 'medium' ? '#eab308' : '#3b82f6'
                    }}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className={`h-5 w-5 ${
                              insight.severity === 'critical' || insight.severity === 'high' 
                                ? 'text-red-500' 
                                : insight.severity === 'medium' 
                                  ? 'text-yellow-500' 
                                  : 'text-blue-500'
                            }`} />
                            <Badge className={getSeverityColor(insight.severity)}>
                              {insight.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <Badge variant="outline">
                            {Math.round(insight.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        
                        <h4 className="font-medium mb-2">{insight.message}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="font-medium text-muted-foreground">Recommended Action:</p>
                            <p>{insight.recommendedAction}</p>
                          </div>
                          <div>
                            <p className="font-medium text-muted-foreground">Timeframe:</p>
                            <p>{insight.estimatedTimeframe}</p>
                          </div>
                        </div>
                        
                        {insight.affectedStores.length > 0 && (
                          <div className="mt-3">
                            <p className="font-medium text-muted-foreground text-sm mb-1">Affected Stores:</p>
                            <div className="flex flex-wrap gap-1">
                              {insight.affectedStores.map(store => (
                                <Badge key={store} variant="secondary" className="text-xs">
                                  {store === 'all' ? 'All Stores' : `Store ${store.slice(0, 8)}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};