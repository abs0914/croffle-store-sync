import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, XCircle, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

interface DeploymentError {
  id: string;
  template_id: string;
  store_id: string;
  error_type: string;
  error_message: string;
  error_details?: any;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
}

interface DeploymentStats {
  totalTemplates: number;
  deployedRecipes: number;
  errorCount: number;
  deploymentRate: number;
}

export function DeploymentStatusMonitor() {
  const [errors, setErrors] = useState<DeploymentError[]>([]);
  const [stats, setStats] = useState<DeploymentStats>({
    totalTemplates: 0,
    deployedRecipes: 0,
    errorCount: 0,
    deploymentRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeploymentData = async () => {
    try {
      setIsLoading(true);

      // Fetch recent deployment errors
      const { data: errorsData, error: errorsError } = await supabase
        .from('recipe_deployment_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (errorsError) throw errorsError;

      // Fetch deployment statistics
      const [templatesResult, recipesResult] = await Promise.all([
        supabase
          .from('recipe_templates')
          .select('id', { count: 'exact' })
          .eq('is_active', true),
        supabase
          .from('recipes')
          .select('id', { count: 'exact' })
          .not('template_id', 'is', null)
      ]);

      const totalTemplates = templatesResult.count || 0;
      const deployedRecipes = recipesResult.count || 0;
      const errorCount = errorsData?.filter(e => !e.resolved).length || 0;
      const deploymentRate = totalTemplates > 0 ? (deployedRecipes / totalTemplates) * 100 : 0;

      setErrors(errorsData || []);
      setStats({
        totalTemplates,
        deployedRecipes,
        errorCount,
        deploymentRate
      });
    } catch (error) {
      console.error('Error fetching deployment data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resolveError = async (errorId: string) => {
    try {
      await supabase
        .from('recipe_deployment_errors')
        .update({ resolved: true })
        .eq('id', errorId);
      
      fetchDeploymentData(); // Refresh data
    } catch (error) {
      console.error('Error resolving deployment error:', error);
    }
  };

  useEffect(() => {
    fetchDeploymentData();
  }, []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Deployment Status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Deployment Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalTemplates}</div>
              <p className="text-xs text-muted-foreground">Active Templates</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.deployedRecipes}</div>
              <p className="text-xs text-muted-foreground">Deployed Recipes</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.errorCount}</div>
              <p className="text-xs text-muted-foreground">Active Errors</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.deploymentRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Deployment Rate</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Status Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Deployment Health</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchDeploymentData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {stats.errorCount === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                All templates are ready for deployment. No active errors detected.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {stats.errorCount} deployment error(s) require attention.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Deployment Errors */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Deployment Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {errors.map((error) => (
                <div key={error.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {error.resolved ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <Badge variant={error.resolved ? "secondary" : "destructive"}>
                        {error.error_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    {!error.resolved && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => resolveError(error.id)}
                      >
                        Mark Resolved
                      </Button>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-600">{error.error_message}</p>
                    {error.error_details && (
                      <p className="text-xs text-muted-foreground">Details: {JSON.stringify(error.error_details)}</p>
                    )}
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Error Details:</strong> Please check the deployment logs for more information.
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(error.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}