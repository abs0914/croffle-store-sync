import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Rocket, Database, Clock, CheckCircle } from "lucide-react";
import { deployAllRecipeTemplatesToAllStores, getDeploymentStats } from "@/services/recipeManagement/sqlBulkDeploymentService";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface BulkDeploymentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DeploymentResult {
  deployed_recipes: number;
  deployed_ingredients: number;
  deployed_products: number;
  skipped_existing: number;
  total_stores: number;
  total_templates?: number;
  execution_time_ms: number;
}

export const BulkDeploymentDialog = ({ isOpen, onClose }: BulkDeploymentDialogProps) => {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState<DeploymentResult | null>(null);
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['deployment-stats'],
    queryFn: getDeploymentStats,
    enabled: isOpen,
    staleTime: 30000,
  });

  const handleBulkDeployment = async () => {
    setIsDeploying(true);
    setDeploymentResult(null);
    
    try {
      const result = await deployAllRecipeTemplatesToAllStores();
      setDeploymentResult(result);
      
      // Invalidate related queries to refresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recipe-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['admin-recipes'] }),
        queryClient.invalidateQueries({ queryKey: ['product-catalog'] }),
      ]);
    } catch (error) {
      console.error('Bulk deployment failed:', error);
    } finally {
      setIsDeploying(false);
    }
  };

  const handleClose = () => {
    if (!isDeploying) {
      setDeploymentResult(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            SQL Bulk Recipe Deployment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          {statsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading deployment statistics...</span>
            </div>
          ) : stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="text-2xl font-bold text-primary">{stats.totalStores}</div>
                <div className="text-sm text-muted-foreground">Active Stores</div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="text-2xl font-bold text-primary">{stats.totalTemplates}</div>
                <div className="text-sm text-muted-foreground">Recipe Templates</div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="text-2xl font-bold text-accent">{stats.estimatedRecipes}</div>
                <div className="text-sm text-muted-foreground">Max Recipes to Deploy</div>
              </div>
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="text-2xl font-bold text-green-600">~10s</div>
                <div className="text-sm text-muted-foreground">Estimated Time</div>
              </div>
            </div>
          )}

          {/* Benefits */}
          <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              SQL Bulk Deployment Benefits:
            </h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>• ⚡ 100x faster than individual API calls</li>
              <li>• 🔄 Atomic transaction - all or nothing</li>
              <li>• 📊 Automatic cost calculation and pricing</li>
              <li>• 🔗 Creates inventory ingredient mappings</li>
              <li>• ✅ Skips existing recipes automatically</li>
            </ul>
          </div>

          {/* Deployment Results */}
          {deploymentResult && (
            <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold text-green-900 dark:text-green-100">
                  Deployment Completed Successfully!
                </h4>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between">
                  <span>New Recipes:</span>
                  <Badge variant="secondary">{deploymentResult.deployed_recipes}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>New Products:</span>
                  <Badge variant="secondary">{deploymentResult.deployed_products}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Ingredients:</span>
                  <Badge variant="secondary">{deploymentResult.deployed_ingredients}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Skipped Existing:</span>
                  <Badge variant="outline">{deploymentResult.skipped_existing}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Total Stores:</span>
                  <Badge variant="outline">{deploymentResult.total_stores}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Execution Time:</span>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {(deploymentResult.execution_time_ms / 1000).toFixed(2)}s
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={isDeploying}>
              {deploymentResult ? 'Close' : 'Cancel'}
            </Button>
            
            {!deploymentResult && (
              <Button 
                onClick={handleBulkDeployment} 
                disabled={isDeploying || !stats}
                className="gap-2"
              >
                {isDeploying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4" />
                    Deploy All Templates
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};