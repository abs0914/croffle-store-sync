import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trash2, 
  AlertTriangle, 
  RefreshCw, 
  CheckCircle,
  Database,
  FileText,
  Package,
  Layers,
  Target,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CleanupIssue {
  id: string;
  type: 'orphaned_ingredients' | 'duplicate_templates' | 'invalid_recipes' | 'broken_mappings' | 'unused_categories';
  title: string;
  description: string;
  count: number;
  severity: 'low' | 'medium' | 'high';
  items: any[];
}

export const RecipeCleanupTools: React.FC = () => {
  const [issues, setIssues] = useState<CleanupIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(0);

  useEffect(() => {
    scanForIssues();
  }, []);

  const scanForIssues = async () => {
    setScanning(true);
    try {
      const foundIssues: CleanupIssue[] = [];

      // 1. Orphaned recipe ingredients (ingredients without valid templates)
      const { data: orphanedIngredients } = await supabase
        .from('recipe_template_ingredients')
        .select(`
          *,
          recipe_templates!left(id, name)
        `)
        .is('recipe_templates.id', null);

      if (orphanedIngredients && orphanedIngredients.length > 0) {
        foundIssues.push({
          id: 'orphaned_ingredients',
          type: 'orphaned_ingredients',
          title: 'Orphaned Recipe Ingredients',
          description: 'Ingredients that reference deleted or non-existent recipe templates',
          count: orphanedIngredients.length,
          severity: 'medium',
          items: orphanedIngredients
        });
      }

      // 2. Duplicate recipe templates (same name and category)
      const { data: allTemplates } = await supabase
        .from('recipe_templates')
        .select('id, name, category_name')
        .eq('is_active', true);

      const duplicateGroups = new Map();
      allTemplates?.forEach(template => {
        const key = `${template.name}-${template.category_name}`;
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key).push(template);
      });

      const duplicates = Array.from(duplicateGroups.values())
        .filter(group => group.length > 1)
        .flat();

      if (duplicates.length > 0) {
        foundIssues.push({
          id: 'duplicate_templates',
          type: 'duplicate_templates',
          title: 'Duplicate Recipe Templates',
          description: 'Multiple templates with the same name and category',
          count: duplicates.length,
          severity: 'high',
          items: duplicates
        });
      }

      // 3. Invalid recipes (recipes without proper ingredients or cost data)
      const { data: invalidRecipes } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients(count)
        `)
        .or('cost_per_serving.is.null,total_cost.is.null');

      const recipesWithoutIngredients = invalidRecipes?.filter(recipe => 
        !recipe.recipe_ingredients || recipe.recipe_ingredients[0]?.count === 0
      ) || [];

      if (recipesWithoutIngredients.length > 0) {
        foundIssues.push({
          id: 'invalid_recipes',
          type: 'invalid_recipes',
          title: 'Invalid Recipes',
          description: 'Recipes missing ingredients or cost information',
          count: recipesWithoutIngredients.length,
          severity: 'high',
          items: recipesWithoutIngredients
        });
      }

      // 4. Broken inventory mappings
      const { data: brokenMappings } = await supabase
        .from('recipe_template_ingredients')
        .select(`
          *,
          inventory_stock!left(id, item)
        `)
        .not('inventory_stock_id', 'is', null)
        .is('inventory_stock.id', null);

      if (brokenMappings && brokenMappings.length > 0) {
        foundIssues.push({
          id: 'broken_mappings',
          type: 'broken_mappings',
          title: 'Broken Inventory Mappings',
          description: 'Recipe ingredients linked to non-existent inventory items',
          count: brokenMappings.length,
          severity: 'medium',
          items: brokenMappings
        });
      }

      // 5. Unused categories
      const { data: allCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true);

      const { data: usedCategories } = await supabase
        .from('recipe_templates')
        .select('category_name')
        .not('category_name', 'is', null);

      const usedCategoryNames = new Set(usedCategories?.map(t => t.category_name) || []);
      const unusedCategories = allCategories?.filter(cat => 
        !usedCategoryNames.has(cat.name)
      ) || [];

      if (unusedCategories.length > 0) {
        foundIssues.push({
          id: 'unused_categories',
          type: 'unused_categories',
          title: 'Unused Categories',
          description: 'Categories not being used by any recipe templates',
          count: unusedCategories.length,
          severity: 'low',
          items: unusedCategories
        });
      }

      setIssues(foundIssues);
      
      if (foundIssues.length === 0) {
        toast.success('No issues found! Your recipe system is clean.');
      } else {
        toast.info(`Found ${foundIssues.length} issue types requiring attention.`);
      }

    } catch (error) {
      console.error('Error scanning for issues:', error);
      toast.error('Failed to scan for cleanup issues');
    } finally {
      setScanning(false);
    }
  };

  const handleCleanupIssue = async (issue: CleanupIssue) => {
    setLoading(true);
    setCleanupProgress(0);
    
    try {
      switch (issue.type) {
        case 'orphaned_ingredients':
          await cleanupOrphanedIngredients(issue.items);
          break;
        case 'duplicate_templates':
          await cleanupDuplicateTemplates(issue.items);
          break;
        case 'invalid_recipes':
          await cleanupInvalidRecipes(issue.items);
          break;
        case 'broken_mappings':
          await cleanupBrokenMappings(issue.items);
          break;
        case 'unused_categories':
          await cleanupUnusedCategories(issue.items);
          break;
      }
      
      toast.success(`Cleaned up ${issue.title.toLowerCase()}`);
      scanForIssues(); // Refresh the scan
      
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast.error(`Failed to cleanup ${issue.title.toLowerCase()}`);
    } finally {
      setLoading(false);
      setCleanupProgress(0);
    }
  };

  const cleanupOrphanedIngredients = async (ingredients: any[]) => {
    for (let i = 0; i < ingredients.length; i++) {
      await supabase
        .from('recipe_template_ingredients')
        .delete()
        .eq('id', ingredients[i].id);
      
      setCleanupProgress(((i + 1) / ingredients.length) * 100);
    }
  };

  const cleanupDuplicateTemplates = async (templates: any[]) => {
    // Group by name+category and keep only the newest
    const groups = new Map();
    templates.forEach(template => {
      const key = `${template.name}-${template.category_name}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(template);
    });

    let processed = 0;
    for (const [key, group] of groups) {
      if (group.length > 1) {
        // Sort by created_at and keep the newest
        group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const toDelete = group.slice(1); // Delete all except the first (newest)
        
        for (const template of toDelete) {
          await supabase
            .from('recipe_templates')
            .update({ is_active: false })
            .eq('id', template.id);
          processed++;
          setCleanupProgress((processed / (templates.length - groups.size)) * 100);
        }
      }
    }
  };

  const cleanupInvalidRecipes = async (recipes: any[]) => {
    for (let i = 0; i < recipes.length; i++) {
      await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', recipes[i].id);
      
      setCleanupProgress(((i + 1) / recipes.length) * 100);
    }
  };

  const cleanupBrokenMappings = async (mappings: any[]) => {
    for (let i = 0; i < mappings.length; i++) {
      await supabase
        .from('recipe_template_ingredients')
        .update({ inventory_stock_id: null })
        .eq('id', mappings[i].id);
      
      setCleanupProgress(((i + 1) / mappings.length) * 100);
    }
  };

  const cleanupUnusedCategories = async (categories: any[]) => {
    for (let i = 0; i < categories.length; i++) {
      await supabase
        .from('categories')
        .update({ is_active: false })
        .eq('id', categories[i].id);
      
      setCleanupProgress(((i + 1) / categories.length) * 100);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'medium': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'orphaned_ingredients': return <Package className="h-5 w-5" />;
      case 'duplicate_templates': return <Layers className="h-5 w-5" />;
      case 'invalid_recipes': return <FileText className="h-5 w-5" />;
      case 'broken_mappings': return <Target className="h-5 w-5" />;
      case 'unused_categories': return <Database className="h-5 w-5" />;
      default: return <Trash2 className="h-5 w-5" />;
    }
  };

  const totalIssues = issues.reduce((sum, issue) => sum + issue.count, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipe Cleanup Tools</h2>
          <p className="text-muted-foreground">
            Scan and fix common recipe management issues
          </p>
        </div>
        <Button onClick={scanForIssues} disabled={scanning}>
          <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? 'animate-spin' : ''}`} />
          {scanning ? 'Scanning...' : 'Scan Again'}
        </Button>
      </div>

      {/* Progress Bar */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Cleanup Progress</span>
                <span>{Math.round(cleanupProgress)}%</span>
              </div>
              <Progress value={cleanupProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{issues.length}</div>
              <p className="text-xs text-muted-foreground">Issue Types</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalIssues}</div>
              <p className="text-xs text-muted-foreground">Total Issues</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {issues.filter(i => i.severity === 'high').length}
              </div>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {issues.length === 0 ? '100' : '0'}%
              </div>
              <p className="text-xs text-muted-foreground">System Health</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      {issues.length > 0 ? (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card key={issue.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getIssueIcon(issue.type)}
                    <div>
                      <CardTitle className="text-lg">{issue.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getSeverityBadgeVariant(issue.severity)}>
                      {issue.severity}
                    </Badge>
                    <Badge variant="outline">
                      {issue.count} items
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(issue.severity)}
                    <span className="text-sm">
                      This issue affects {issue.count} items in your recipe system
                    </span>
                  </div>
                  <Button 
                    onClick={() => handleCleanupIssue(issue)}
                    disabled={loading}
                    variant={issue.severity === 'high' ? 'destructive' : 'outline'}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Fix Issues
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                System Clean!
              </h3>
              <p className="text-green-700">
                No issues found in your recipe management system. Everything looks good!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Safety Notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Cleanup operations will modify your data. 
          Make sure to backup your database before running any cleanup tools. 
          Some cleanup actions (like deleting orphaned data) cannot be undone.
        </AlertDescription>
      </Alert>
    </div>
  );
};
