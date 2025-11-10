/**
 * Emergency repair button for product-recipe linkage issues
 * Can be added to inventory or admin pages for quick fixes
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wrench, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { repairProductRecipeLinkage, verifyLinkageHealth } from '@/services/inventory/productRecipeLinkageRepair';
import { toast } from 'sonner';

interface ProductRecipeLinkageRepairButtonProps {
  storeId?: string;
}

export function ProductRecipeLinkageRepairButton({ storeId }: ProductRecipeLinkageRepairButtonProps) {
  const [isRepairing, setIsRepairing] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{
    healthy: boolean;
    unlinkedProducts: number;
    unlinkedRecipes: number;
    details: string[];
  } | null>(null);
  const [repairResult, setRepairResult] = useState<{
    productsLinked: number;
    recipesLinked: number;
    errors: string[];
  } | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    try {
      const health = await verifyLinkageHealth(storeId);
      setHealthStatus(health);
      
      if (health.healthy) {
        toast.success('All products are properly linked to recipes');
      } else {
        toast.warning(`Found ${health.unlinkedProducts} products needing repair`);
      }
    } catch (error) {
      toast.error('Failed to check linkage health');
      console.error('Health check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const runRepair = async () => {
    setIsRepairing(true);
    setRepairResult(null);
    
    try {
      const result = await repairProductRecipeLinkage(storeId);
      setRepairResult({
        productsLinked: result.productsLinked,
        recipesLinked: result.recipesLinked,
        errors: result.errors
      });
      
      // Refresh health status after repair
      await checkHealth();
      
      if (result.success) {
        toast.success(`Repaired ${result.productsLinked} product linkages`);
      }
    } catch (error) {
      toast.error('Repair operation failed');
      console.error('Repair error:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  return (
    <Card className="border-warning">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Product-Recipe Linkage Repair
        </CardTitle>
        <CardDescription>
          Fix products that can't be sold due to missing recipe links
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Status */}
        {healthStatus && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Linkage Health:</span>
              {healthStatus.healthy ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Healthy
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Repair
                </Badge>
              )}
            </div>
            
            {!healthStatus.healthy && (
              <div className="text-sm space-y-1 p-3 bg-muted rounded-md">
                <div className="flex justify-between">
                  <span>Products without recipes:</span>
                  <span className="font-medium text-destructive">{healthStatus.unlinkedProducts}</span>
                </div>
                <div className="flex justify-between">
                  <span>Recipes without products:</span>
                  <span className="font-medium text-warning">{healthStatus.unlinkedRecipes}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Repair Result */}
        {repairResult && (
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="font-medium text-sm">Repair Results:</div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Products linked:</span>
                <span className="font-medium text-green-600">{repairResult.productsLinked}</span>
              </div>
              <div className="flex justify-between">
                <span>Recipes linked:</span>
                <span className="font-medium text-green-600">{repairResult.recipesLinked}</span>
              </div>
              {repairResult.errors.length > 0 && (
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span className="font-medium text-destructive">{repairResult.errors.length}</span>
                </div>
              )}
            </div>
            {repairResult.errors.length > 0 && (
              <details className="text-xs mt-2">
                <summary className="cursor-pointer text-muted-foreground">View errors</summary>
                <ul className="mt-2 space-y-1 text-destructive">
                  {repairResult.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                  {repairResult.errors.length > 5 && (
                    <li>• ... and {repairResult.errors.length - 5} more</li>
                  )}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={checkHealth}
            disabled={isChecking || isRepairing}
            className="flex-1"
          >
            {isChecking ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              'Check Health'
            )}
          </Button>
          
          <Button
            variant="default"
            onClick={runRepair}
            disabled={isRepairing || isChecking || (healthStatus?.healthy ?? true)}
            className="flex-1"
          >
            {isRepairing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Repairing...
              </>
            ) : (
              <>
                <Wrench className="h-4 w-4 mr-2" />
                Run Repair
              </>
            )}
          </Button>
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          <p>
            <strong>What this fixes:</strong> Products marked as "recipe" type but missing the recipe_id link,
            which causes "Insufficient stock" errors even when inventory is available.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
