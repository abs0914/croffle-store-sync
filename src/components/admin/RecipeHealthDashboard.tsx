import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { transactionRepairService } from '@/services/pos/transactionRepairService';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface RepairStatus {
  total_products: number;
  products_with_recipes: number;
  products_missing_recipes: number;
  recipes_with_templates: number;
  recipes_missing_templates: number;
  orphaned_products: number;
}

interface RepairResult {
  action_type: string;
  product_name: string;
  template_name: string;
  recipe_id: string;
  template_id: string;
  success: boolean;
  error_message?: string;
}

export const RecipeHealthDashboard: React.FC = () => {
  const [status, setStatus] = useState<RepairStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairResults, setRepairResults] = useState<RepairResult[]>([]);
  const [lastRepairTime, setLastRepairTime] = useState<Date | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const statusData = await transactionRepairService.getRepairStatus();
      setStatus(statusData);
    } catch (error) {
      console.error('Failed to load repair status:', error);
      toast({
        title: "Error",
        description: "Failed to load recipe health status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runRepair = async () => {
    setIsRepairing(true);
    setRepairResults([]);
    
    try {
      const result = await transactionRepairService.runDatabaseRepair();
      
      if (result.success && result.results) {
        setRepairResults(result.results);
        setLastRepairTime(new Date());
        
        const successCount = result.results.filter(r => r.success).length;
        const totalCount = result.results.length;
        
        toast({
          title: "Repair Completed",
          description: `Successfully repaired ${successCount}/${totalCount} issues`,
          variant: "default",
        });
        
        // Reload status after repair
        await loadStatus();
      } else {
        toast({
          title: "Repair Failed",
          description: result.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Repair failed:', error);
      toast({
        title: "Repair Error",
        description: "Failed to run repair process",
        variant: "destructive",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const getHealthScore = () => {
    if (!status) return 0;
    const total = status.total_products;
    if (total === 0) return 100;
    return Math.round((status.products_with_recipes / total) * 100);
  };

  const getHealthColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recipe Health Dashboard</CardTitle>
          <CardDescription>Loading health status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const healthScore = getHealthScore();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Recipe Health Dashboard
            <Button 
              onClick={loadStatus} 
              variant="outline" 
              size="sm"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardTitle>
          <CardDescription>
            Monitor and repair recipe-template relationships across your system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status && (
            <div className="space-y-6">
              {/* Health Score */}
              <div className="text-center">
                <div className={`text-4xl font-bold ${getHealthColor(healthScore)}`}>
                  {healthScore}%
                </div>
                <p className="text-muted-foreground">System Health Score</p>
                <Progress value={healthScore} className="mt-2 max-w-md mx-auto" />
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {status.total_products}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Products</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {status.products_with_recipes}
                  </div>
                  <div className="text-sm text-muted-foreground">With Recipes</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {status.products_missing_recipes}
                  </div>
                  <div className="text-sm text-muted-foreground">Missing Recipes</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {status.recipes_with_templates}
                  </div>
                  <div className="text-sm text-muted-foreground">Recipes with Templates</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {status.recipes_missing_templates}
                  </div>
                  <div className="text-sm text-muted-foreground">Missing Templates</div>
                </div>
                
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {status.orphaned_products}
                  </div>
                  <div className="text-sm text-muted-foreground">Orphaned Products</div>
                </div>
              </div>

              {/* Repair Actions */}
              <div className="flex justify-center space-x-4">
                <Button 
                  onClick={runRepair}
                  disabled={isRepairing}
                  size="lg"
                  className="min-w-[200px]"
                >
                  {isRepairing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Repairing...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Run Auto-Repair
                    </>
                  )}
                </Button>
              </div>

              {lastRepairTime && (
                <div className="text-center text-sm text-muted-foreground">
                  Last repair: {lastRepairTime.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repair Results */}
      {repairResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Latest Repair Results</CardTitle>
            <CardDescription>
              {repairResults.filter(r => r.success).length} successful, {' '}
              {repairResults.filter(r => !r.success).length} failed operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {repairResults.map((result, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{result.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {result.action_type.replace(/_/g, ' ')}
                        {result.template_name && ` → ${result.template_name}`}
                      </div>
                    </div>
                  </div>
                  <Badge variant={result.success ? "default" : "destructive"}>
                    {result.success ? "Success" : "Failed"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};