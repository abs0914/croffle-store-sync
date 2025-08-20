import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { InventoryItemCategory } from '@/types/inventory';

interface ValidationResult {
  ingredientName: string;
  recipeId: string;
  recipeName: string;
  expectedCategories: InventoryItemCategory[];
  actualMatches: Array<{
    item: string;
    category: InventoryItemCategory;
    confidence: number;
  }>;
  isValid: boolean;
  issues: string[];
}

interface CategoryStats {
  category: InventoryItemCategory;
  count: number;
  examples: string[];
}

export const CategoryBasedInventoryValidator: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('validation');

  const validateRecipeIngredients = async () => {
    setIsLoading(true);
    try {
      // Get all recipe templates with ingredients
      const { data: templates, error: templatesError } = await supabase
        .from('recipe_templates')
        .select(`
          id,
          name,
          recipe_template_ingredients (
            ingredient_name,
            unit
          )
        `)
        .eq('is_active', true);

      if (templatesError) throw templatesError;

      // Get category mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('ingredient_category_mappings')
        .select('*')
        .order('priority', { ascending: false });

      if (mappingsError) throw mappingsError;

      // Get all inventory items for pattern matching
      const { data: inventory, error: inventoryError } = await supabase
        .from('inventory_stock')
        .select('item, item_category, store_id')
        .eq('is_active', true);

      if (inventoryError) throw inventoryError;

      const results: ValidationResult[] = [];

      for (const template of templates || []) {
        for (const ingredient of template.recipe_template_ingredients || []) {
          const expectedCategories = getExpectedCategoriesForIngredient(
            ingredient.ingredient_name,
            mappings || []
          );

          const actualMatches = inventory
            ?.filter(item => 
              item.item.toLowerCase().includes(ingredient.ingredient_name.toLowerCase()) ||
              ingredient.ingredient_name.toLowerCase().includes(item.item.toLowerCase())
            )
            .map(item => ({
              item: item.item,
              category: item.item_category as InventoryItemCategory,
              confidence: calculateMatchConfidence(ingredient.ingredient_name, item.item)
            })) || [];

          const isValid = actualMatches.some(match => 
            expectedCategories.length === 0 || expectedCategories.includes(match.category)
          );

          const issues: string[] = [];
          if (!isValid && actualMatches.length > 0) {
            issues.push(`Expected categories: ${expectedCategories.join(', ')}, but found in: ${actualMatches.map(m => m.category).join(', ')}`);
          }
          if (actualMatches.length === 0) {
            issues.push('No matching inventory items found');
          }

          results.push({
            ingredientName: ingredient.ingredient_name,
            recipeId: template.id,
            recipeName: template.name,
            expectedCategories,
            actualMatches,
            isValid,
            issues
          });
        }
      }

      setValidationResults(results);
      toast.success(`Validated ${results.length} recipe ingredients`);
    } catch (error) {
      console.error('Validation error:', error);
      toast.error('Failed to validate recipe ingredients');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategoryStats = async () => {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('item, item_category')
        .eq('is_active', true);

      if (error) throw error;

      const statsMap = new Map<InventoryItemCategory, { count: number; examples: string[] }>();
      
      inventory?.forEach(item => {
        const category = item.item_category as InventoryItemCategory;
        if (!statsMap.has(category)) {
          statsMap.set(category, { count: 0, examples: [] });
        }
        const stat = statsMap.get(category)!;
        stat.count++;
        if (stat.examples.length < 5) {
          stat.examples.push(item.item);
        }
      });

      const stats: CategoryStats[] = Array.from(statsMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        examples: data.examples
      })).sort((a, b) => b.count - a.count);

      setCategoryStats(stats);
    } catch (error) {
      console.error('Error loading category stats:', error);
      toast.error('Failed to load category statistics');
    }
  };

  useEffect(() => {
    loadCategoryStats();
  }, []);

  const getExpectedCategoriesForIngredient = (
    ingredientName: string,
    mappings: any[]
  ): InventoryItemCategory[] => {
    const lowerName = ingredientName.toLowerCase();
    for (const mapping of mappings) {
      if (lowerName.includes(mapping.ingredient_pattern.toLowerCase())) {
        return mapping.expected_categories;
      }
    }
    return [];
  };

  const calculateMatchConfidence = (ingredientName: string, itemName: string): number => {
    const ingredient = ingredientName.toLowerCase();
    const item = itemName.toLowerCase();
    
    if (ingredient === item) return 1.0;
    if (ingredient.includes(item) || item.includes(ingredient)) return 0.8;
    return 0.5;
  };

  const validCount = validationResults.filter(r => r.isValid).length;
  const invalidCount = validationResults.length - validCount;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Category-Based Inventory Validator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Button 
              onClick={validateRecipeIngredients}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Validate Recipe Ingredients
            </Button>
            
            {validationResults.length > 0 && (
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-100 text-green-800">{validCount} Valid</Badge>
                <Badge variant="destructive">{invalidCount} Issues</Badge>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="validation">Validation Results</TabsTrigger>
              <TabsTrigger value="categories">Category Statistics</TabsTrigger>
            </TabsList>

            <TabsContent value="validation" className="space-y-4">
              {validationResults.length === 0 ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Click "Validate Recipe Ingredients" to check if recipe ingredients match expected inventory categories.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-2">
                  {validationResults.map((result, index) => (
                    <Card key={index} className={`border-l-4 ${result.isValid ? 'border-l-green-500' : 'border-l-red-500'}`}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium">{result.ingredientName}</h4>
                            <p className="text-sm text-muted-foreground">Recipe: {result.recipeName}</p>
                            {result.expectedCategories.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                <span className="text-xs text-muted-foreground">Expected:</span>
                                {result.expectedCategories.map(cat => (
                                  <Badge key={cat} variant="outline" className="text-xs">
                                    {cat.replace('_', ' ')}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            {result.actualMatches.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                <span className="text-xs text-muted-foreground">Found:</span>
                                {result.actualMatches.slice(0, 3).map((match, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {match.item} ({match.category.replace('_', ' ')})
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <Badge variant={result.isValid ? 'default' : 'destructive'} 
                                 className={result.isValid ? 'bg-green-100 text-green-800' : ''}>
                            {result.isValid ? 'Valid' : 'Issues'}
                          </Badge>
                        </div>
                        {result.issues.length > 0 && (
                          <div className="mt-2 text-sm text-red-600">
                            {result.issues.map((issue, i) => (
                              <div key={i}>• {issue}</div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="categories" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {categoryStats.map(stat => (
                  <Card key={stat.category}>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">
                        {stat.category.replace('_', ' ').toUpperCase()}
                      </h4>
                      <p className="text-2xl font-bold text-primary mb-2">{stat.count}</p>
                      <div className="text-xs text-muted-foreground">
                        <div className="font-medium mb-1">Examples:</div>
                        {stat.examples.map((example, i) => (
                          <div key={i}>• {example}</div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};