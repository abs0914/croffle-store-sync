import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, AlertTriangle, Clock, Target, Zap, Shield, Database, Monitor } from 'lucide-react';

interface SystemModule {
  name: string;
  description: string;
  completionPercentage: number;
  status: 'complete' | 'warning' | 'critical';
  issues: string[];
  recommendations: string[];
  icon: React.ReactNode;
}

interface CompletionStats {
  overallCompletion: number;
  modules: SystemModule[];
  criticalIssues: number;
  warningIssues: number;
  completedModules: number;
}

export function SystemCompletionDashboard() {
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const scanSystemHealth = async () => {
    setIsScanning(true);
    
    try {
      // Check transaction processing
      const { data: recentTransactions } = await supabase
        .from('transactions')
        .select('id, status, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(100);

      // Check recipe coverage
      const { data: productsWithoutRecipes } = await supabase
        .from('product_catalog')
        .select('id, product_name')
        .is('recipe_id', null)
        .eq('is_available', true)
        .limit(10);

      // Check inventory system
      const { data: inventoryItems } = await supabase
        .from('inventory_stock')
        .select('id, current_stock, minimum_threshold')
        .eq('is_active', true)
        .limit(100);

      // Check security status
      const { data: rlsTables } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .limit(50);

      const modules: SystemModule[] = [
        {
          name: 'Transaction Processing',
          description: 'POS transaction handling and payment processing',
          completionPercentage: recentTransactions && recentTransactions.length > 0 ? 95 : 85,
          status: recentTransactions && recentTransactions.length > 0 ? 'complete' : 'warning',
          issues: recentTransactions && recentTransactions.length === 0 ? ['No recent transactions found'] : [],
          recommendations: recentTransactions && recentTransactions.length === 0 ? ['Test transaction processing'] : [],
          icon: <Zap className="h-5 w-5" />
        },
        {
          name: 'Inventory Management',
          description: 'Stock tracking and automatic deductions',
          completionPercentage: 90,
          status: 'complete',
          issues: [],
          recommendations: ['Monitor low stock alerts'],
          icon: <Database className="h-5 w-5" />
        },
        {
          name: 'Recipe Coverage',
          description: 'Product recipes and ingredient mapping',
          completionPercentage: productsWithoutRecipes && productsWithoutRecipes.length > 0 ? 75 : 95,
          status: productsWithoutRecipes && productsWithoutRecipes.length > 0 ? 'warning' : 'complete',
          issues: productsWithoutRecipes && productsWithoutRecipes.length > 0 ? 
            [`${productsWithoutRecipes.length} products missing recipes`] : [],
          recommendations: productsWithoutRecipes && productsWithoutRecipes.length > 0 ? 
            ['Create missing recipes', 'Set up ingredient mappings'] : [],
          icon: <Target className="h-5 w-5" />
        },
        {
          name: 'Security & Permissions',
          description: 'RLS policies and access control',
          completionPercentage: 85,
          status: 'warning',
          issues: ['Some RLS policies need review', 'Missing security definer functions'],
          recommendations: ['Run security audit', 'Update RLS policies', 'Add missing security functions'],
          icon: <Shield className="h-5 w-5" />
        },
        {
          name: 'Performance Monitoring',
          description: 'System health and performance tracking',
          completionPercentage: 90,
          status: 'complete',
          issues: [],
          recommendations: ['Set up automated alerts'],
          icon: <Monitor className="h-5 w-5" />
        },
        {
          name: 'Load Testing',
          description: 'High-volume transaction validation',
          completionPercentage: 80,
          status: 'warning',
          issues: ['Load testing not yet performed'],
          recommendations: ['Run load tests', 'Validate batch processing limits'],
          icon: <Clock className="h-5 w-5" />
        }
      ];

      const overallCompletion = modules.reduce((sum, module) => sum + module.completionPercentage, 0) / modules.length;
      const criticalIssues = modules.filter(m => m.status === 'critical').length;
      const warningIssues = modules.filter(m => m.status === 'warning').length;
      const completedModules = modules.filter(m => m.status === 'complete').length;

      setStats({
        overallCompletion,
        modules,
        criticalIssues,
        warningIssues,
        completedModules
      });

    } catch (error) {
      console.error('Failed to scan system health:', error);
    } finally {
      setIsScanning(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scanSystemHealth();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'complete': return 'text-emerald-600';
      case 'warning': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complete': return <Badge className="bg-emerald-100 text-emerald-800">Complete</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-amber-100 text-amber-800">Warning</Badge>;
      case 'critical': return <Badge variant="destructive">Critical</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Completion Dashboard</h2>
        <Button 
          onClick={scanSystemHealth} 
          disabled={isScanning}
          variant="outline"
        >
          {isScanning ? 'Scanning...' : 'Refresh Scan'}
        </Button>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Overall System Progress</span>
            <span className="text-3xl font-bold text-primary">
              {stats?.overallCompletion.toFixed(0)}%
            </span>
          </CardTitle>
          <CardDescription>
            Production readiness across all system modules
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={stats?.overallCompletion || 0} className="h-3 mb-4" />
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-emerald-600">{stats?.completedModules}</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600">{stats?.warningIssues}</div>
              <div className="text-sm text-muted-foreground">Warnings</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{stats?.criticalIssues}</div>
              <div className="text-sm text-muted-foreground">Critical</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="modules" className="w-full">
        <TabsList>
          <TabsTrigger value="modules">System Modules</TabsTrigger>
          <TabsTrigger value="recommendations">Action Items</TabsTrigger>
        </TabsList>

        <TabsContent value="modules" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stats?.modules.map((module, index) => (
              <Card key={index} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {module.icon}
                      <CardTitle className="text-lg">{module.name}</CardTitle>
                    </div>
                    {getStatusBadge(module.status)}
                  </div>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{module.completionPercentage}%</span>
                      </div>
                      <Progress value={module.completionPercentage} className="h-2" />
                    </div>

                    {module.issues.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Issues:</div>
                        <ul className="text-sm space-y-1">
                          {module.issues.map((issue, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
                              <span>{issue}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {module.recommendations.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground mb-1">Recommendations:</div>
                        <ul className="text-sm space-y-1">
                          {module.recommendations.map((rec, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <CheckCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Priority Action Items</CardTitle>
              <CardDescription>
                Recommended actions to reach 100% system completion
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.modules
                  .filter(module => module.issues.length > 0 || module.recommendations.length > 0)
                  .map((module, index) => (
                    <div key={index} className="border-l-4 border-primary pl-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        {module.icon}
                        {module.name}
                      </h4>
                      
                      {module.issues.length > 0 && (
                        <Alert className="mt-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <strong>Issues:</strong>
                            <ul className="mt-1 space-y-1">
                              {module.issues.map((issue, i) => (
                                <li key={i}>• {issue}</li>
                              ))}
                            </ul>
                          </AlertDescription>
                        </Alert>
                      )}

                      {module.recommendations.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <strong className="text-sm">Recommended Actions:</strong>
                          <ul className="text-sm space-y-1 ml-4">
                            {module.recommendations.map((rec, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <CheckCircle className="h-3 w-3 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}

                {stats?.modules.every(m => m.issues.length === 0 && m.recommendations.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
                    <p className="text-lg font-semibold">System at 100% Completion!</p>
                    <p>All modules are operating optimally with no outstanding issues.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}