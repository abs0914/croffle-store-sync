import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  Database, 
  ArrowRight, 
  CheckCircle,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { unifiedRecipeRouter } from '@/services/recipeManagement/unifiedRecipeRouter';

interface SystemStats {
  totalUnified: number;
  totalLegacy: number;
  storeBreakdown: Array<{
    store_id: string;
    store_name: string;
    unified_count: number;
    legacy_count: number;
  }>;
}

interface RecipeSystemStatusProps {
  storeId?: string;
  showFullBreakdown?: boolean;
}

export const RecipeSystemStatus: React.FC<RecipeSystemStatusProps> = ({ 
  storeId, 
  showFullBreakdown = false 
}) => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const systemStats = await unifiedRecipeRouter.getSystemStatistics();
      setStats(systemStats);
    } catch (error) {
      console.error('Error loading system stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <RefreshCw className="h-4 w-4 animate-spin mr-2" />
          Loading system status...
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const currentStoreStats = storeId ? 
    stats.storeBreakdown.find(store => store.store_id === storeId) : 
    null;

  const migrationProgress = stats.totalUnified + stats.totalLegacy > 0 
    ? (stats.totalUnified / (stats.totalUnified + stats.totalLegacy)) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Overall System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Recipe System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalUnified}
              </div>
              <div className="text-sm text-muted-foreground">
                New System (Unified)
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {stats.totalLegacy}
              </div>
              <div className="text-sm text-muted-foreground">
                Legacy System
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {migrationProgress.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">
                Migration Progress
              </div>
            </div>
          </div>

          {/* Migration Status Alert */}
          <Alert className={stats.totalLegacy > 0 ? "border-amber-200 bg-amber-50" : "border-green-200 bg-green-50"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {stats.totalLegacy > 0 ? (
                <>
                  <strong>Migration in Progress:</strong> You have {stats.totalLegacy} recipes 
                  in the legacy system that need to be migrated to the unified system. 
                  All recipes are currently editable using the smart routing system.
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 inline mr-1" />
                  <strong>Migration Complete:</strong> All recipes have been successfully 
                  migrated to the unified system.
                </>
              )}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Current Store Status */}
      {currentStoreStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Current Store: {currentStoreStats.store_name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-100 text-blue-800">
                    {currentStoreStats.unified_count} New System
                  </Badge>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                    {currentStoreStats.legacy_count} Legacy System
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total: {currentStoreStats.unified_count + currentStoreStats.legacy_count} recipes
                </div>
              </div>
              {currentStoreStats.legacy_count > 0 && (
                <div className="text-sm text-muted-foreground">
                  <ArrowRight className="h-4 w-4 inline mr-1" />
                  {currentStoreStats.legacy_count} recipes pending migration
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Store Breakdown */}
      {showFullBreakdown && stats.storeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Store Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.storeBreakdown.map(store => {
                const totalRecipes = store.unified_count + store.legacy_count;
                const migrationPct = totalRecipes > 0 
                  ? (store.unified_count / totalRecipes) * 100 
                  : 0;

                return (
                  <div key={store.store_id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{store.store_name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="text-xs">
                          {store.unified_count} unified
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {store.legacy_count} legacy
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {migrationPct.toFixed(0)}% migrated
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {totalRecipes} total recipes
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={loadStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Status
        </Button>
      </div>
    </div>
  );
};