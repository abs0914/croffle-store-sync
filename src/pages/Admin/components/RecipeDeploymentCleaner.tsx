import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Trash2, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Package,
  AlertCircle,
  Target,
  Rocket
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RecipeIssue {
  id: string;
  name: string;
  store_name: string;
  store_id: string;
  template_id?: string;
  issue_type: 'no_ingredients' | 'no_mappings' | 'incomplete_deployment' | 'orphaned';
  ingredient_count: number;
  mapping_count: number;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

interface CleanupStats {
  total_recipes: number;
  recipes_with_issues: number;
  recipes_with_no_ingredients: number;
  recipes_with_no_mappings: number;
  orphaned_recipes: number;
}

export const RecipeDeploymentCleaner: React.FC = () => {
  const [issues, setIssues] = useState<RecipeIssue[]>([]);
  const [stats, setStats] = useState<CleanupStats | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCleanupDialogOpen, setIsCleanupDialogOpen] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    analyzeRecipeIssues();
  }, []);

  const analyzeRecipeIssues = async () => {
    setIsAnalyzing(true);
    setIsLoading(true);
    
    try {
      // Get all deployed recipes with their ingredient counts and mapping status
      const { data: recipesData } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          store_id,
          template_id,
          stores(name),
          recipe_ingredients(
            id,
            inventory_stock_id
          )
        `)
        .eq('is_active', true);

      if (!recipesData) {
        setStats({
          total_recipes: 0,
          recipes_with_issues: 0,
          recipes_with_no_ingredients: 0,
          recipes_with_no_mappings: 0,
          orphaned_recipes: 0
        });
        setIssues([]);
        return;
      }

      // Get conversion mappings for each store
      const storeIds = [...new Set(recipesData.map(r => r.store_id))];
      const mappingsByStore = new Map();
      
      for (const storeId of storeIds) {
        const { data: mappings } = await supabase
          .from('inventory_conversion_mappings')
          .select(`
            recipe_ingredient_name,
            inventory_stock(store_id)
          `)
          .eq('inventory_stock.store_id', storeId)
          .eq('is_active', true);
        
        const ingredientNames = new Set(mappings?.map(m => m.recipe_ingredient_name) || []);
        mappingsByStore.set(storeId, ingredientNames);
      }

      const detectedIssues: RecipeIssue[] = [];
      let noIngredientsCount = 0;
      let noMappingsCount = 0;
      let orphanedCount = 0;

      for (const recipe of recipesData) {
        const ingredientCount = recipe.recipe_ingredients?.length || 0;
        const storeMappings = mappingsByStore.get(recipe.store_id) || new Set();
        
        // Check for recipes with no ingredients
        if (ingredientCount === 0) {
          noIngredientsCount++;
          detectedIssues.push({
            id: recipe.id,
            name: recipe.name,
            store_name: (recipe.stores as any)?.name || 'Unknown Store',
            store_id: recipe.store_id,
            template_id: recipe.template_id,
            issue_type: 'no_ingredients',
            ingredient_count: 0,
            mapping_count: 0,
            description: 'Recipe has no ingredients defined',
            severity: 'high'
          });
          continue;
        }

        // Check for mapping issues
        const ingredientsWithMappings = recipe.recipe_ingredients?.filter(ing => 
          ing.inventory_stock_id || storeMappings.has(ing.inventory_stock_id)
        ).length || 0;

        const mappingPercentage = ingredientCount > 0 ? (ingredientsWithMappings / ingredientCount) * 100 : 0;

        if (mappingPercentage < 50) {
          noMappingsCount++;
          detectedIssues.push({
            id: recipe.id,
            name: recipe.name,
            store_name: (recipe.stores as any)?.name || 'Unknown Store',
            store_id: recipe.store_id,
            template_id: recipe.template_id,
            issue_type: 'no_mappings',
            ingredient_count: ingredientCount,
            mapping_count: ingredientsWithMappings,
            description: `Only ${ingredientsWithMappings}/${ingredientCount} ingredients have inventory mappings`,
            severity: mappingPercentage === 0 ? 'high' : 'medium'
          });
        }

        // Check for orphaned recipes (no template link)
        if (!recipe.template_id) {
          orphanedCount++;
          detectedIssues.push({
            id: recipe.id,
            name: recipe.name,
            store_name: (recipe.stores as any)?.name || 'Unknown Store',
            store_id: recipe.store_id,
            template_id: recipe.template_id,
            issue_type: 'orphaned',
            ingredient_count: ingredientCount,
            mapping_count: ingredientsWithMappings,
            description: 'Recipe is not linked to a template',
            severity: 'low'
          });
        }
      }

      setStats({
        total_recipes: recipesData.length,
        recipes_with_issues: detectedIssues.length,
        recipes_with_no_ingredients: noIngredientsCount,
        recipes_with_no_mappings: noMappingsCount,
        orphaned_recipes: orphanedCount
      });

      setIssues(detectedIssues);
      
    } catch (error) {
      console.error('Error analyzing recipe issues:', error);
      toast.error('Failed to analyze recipe issues');
    } finally {
      setIsLoading(false);
      setIsAnalyzing(false);
    }
  };

  const handleIssueSelection = (issueId: string, checked: boolean) => {
    const newSelected = new Set(selectedIssues);
    if (checked) {
      newSelected.add(issueId);
    } else {
      newSelected.delete(issueId);
    }
    setSelectedIssues(newSelected);
  };

  const selectAllIssues = (issueType?: string) => {
    if (issueType) {
      const typeIssues = issues.filter(issue => issue.issue_type === issueType);
      const newSelected = new Set([...selectedIssues, ...typeIssues.map(i => i.id)]);
      setSelectedIssues(newSelected);
    } else {
      setSelectedIssues(new Set(issues.map(i => i.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIssues(new Set());
  };

  const cleanupSelectedIssues = async () => {
    if (selectedIssues.size === 0) {
      toast.error('No issues selected for cleanup');
      return;
    }

    setIsCleanupDialogOpen(true);
    setCleanupProgress(0);

    try {
      const selectedIssuesList = issues.filter(issue => selectedIssues.has(issue.id));
      let completed = 0;
      const total = selectedIssuesList.length;

      for (const issue of selectedIssuesList) {
        try {
          switch (issue.issue_type) {
            case 'no_ingredients':
              // Delete recipes with no ingredients
              await supabase
                .from('recipes')
                .delete()
                .eq('id', issue.id);
              break;

            case 'no_mappings':
              // Mark recipes as inactive instead of deleting
              await supabase
                .from('recipes')
                .update({ is_active: false })
                .eq('id', issue.id);
              break;

            case 'orphaned':
              // Try to link to template if possible, otherwise mark inactive
              await supabase
                .from('recipes')
                .update({ is_active: false })
                .eq('id', issue.id);
              break;
          }

          completed++;
          setCleanupProgress((completed / total) * 100);
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Error cleaning up recipe ${issue.name}:`, error);
        }
      }

      toast.success(`Cleaned up ${completed} recipe issues`);
      setSelectedIssues(new Set());
      await analyzeRecipeIssues(); // Refresh the analysis

    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error('Failed to complete cleanup');
    } finally {
      setIsCleanupDialogOpen(false);
      setCleanupProgress(0);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <Package className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipe Deployment Cleanup</h2>
          <p className="text-muted-foreground">
            Identify and fix issues with deployed recipes
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={analyzeRecipeIssues} variant="outline" disabled={isAnalyzing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
          </Button>
          <Button 
            onClick={cleanupSelectedIssues} 
            variant="destructive"
            disabled={selectedIssues.size === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Cleanup Selected ({selectedIssues.size})
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total_recipes}</div>
                <p className="text-xs text-muted-foreground">Total Recipes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{stats.recipes_with_issues}</div>
                <p className="text-xs text-muted-foreground">With Issues</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.recipes_with_no_ingredients}</div>
                <p className="text-xs text-muted-foreground">No Ingredients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{stats.recipes_with_no_mappings}</div>
                <p className="text-xs text-muted-foreground">No Mappings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">{stats.orphaned_recipes}</div>
                <p className="text-xs text-muted-foreground">Orphaned</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => selectAllIssues('no_ingredients')} variant="outline" size="sm">
              Select All No-Ingredient Issues
            </Button>
            <Button onClick={() => selectAllIssues('no_mappings')} variant="outline" size="sm">
              Select All Mapping Issues
            </Button>
            <Button onClick={() => selectAllIssues('orphaned')} variant="outline" size="sm">
              Select All Orphaned
            </Button>
            <Button onClick={() => selectAllIssues()} variant="outline" size="sm">
              Select All Issues
            </Button>
            <Button onClick={clearSelection} variant="outline" size="sm">
              Clear Selection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Detected Issues ({issues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issues.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold mb-2">No Issues Found!</h3>
              <p>All deployed recipes are properly configured.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedIssues.size === issues.length && issues.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            selectAllIssues();
                          } else {
                            clearSelection();
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead>Store</TableHead>
                    <TableHead>Issue Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => (
                    <TableRow key={issue.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIssues.has(issue.id)}
                          onCheckedChange={(checked) => handleIssueSelection(issue.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{issue.name}</TableCell>
                      <TableCell>{issue.store_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {issue.issue_type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getSeverityColor(issue.severity) as any}>
                          {getSeverityIcon(issue.severity)}
                          <span className="ml-1">{issue.severity}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        <div className="truncate" title={issue.description}>
                          {issue.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          Ingredients: {issue.ingredient_count} | Mappings: {issue.mapping_count}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Progress Dialog */}
      <Dialog open={isCleanupDialogOpen} onOpenChange={setIsCleanupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cleaning Up Recipe Issues</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Processing selected recipe issues and applying fixes...
            </p>
            <Progress value={cleanupProgress} className="w-full" />
            <p className="text-xs text-center">{Math.round(cleanupProgress)}% Complete</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};