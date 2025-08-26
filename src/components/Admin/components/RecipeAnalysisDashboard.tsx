import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp,
  RefreshCw,
  Database,
  Target,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Users,
  Package,
  Zap
} from 'lucide-react';
import { recipeAnalysisService, RecipeAnalysisResult } from '@/services/migration/recipeAnalysisService';
import { ingredientStandardization, IngredientSuggestion } from '@/services/migration/ingredientStandardization';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface RecipeAnalysisDashboardProps {
  onStartMigration?: (phase: number) => void;
}

export const RecipeAnalysisDashboard: React.FC<RecipeAnalysisDashboardProps> = ({
  onStartMigration
}) => {
  const [analysisResult, setAnalysisResult] = useState<RecipeAnalysisResult | null>(null);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<IngredientSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);

  useEffect(() => {
    runAnalysis();
  }, []);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      console.log('🚀 Starting recipe analysis...');
      const result = await recipeAnalysisService.analyzeAllRecipes();
      setAnalysisResult(result);

      // Also run ingredient standardization analysis
      const recipes = await fetchRecipesForIngredientAnalysis();
      const suggestions = await ingredientStandardization.analyzeIngredientStandardization(recipes);
      setIngredientSuggestions(suggestions);
      
      console.log('✅ Analysis complete');
    } catch (error) {
      console.error('❌ Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fetchRecipesForIngredientAnalysis = async () => {
    // This would fetch the same data that recipeAnalysisService uses
    // For now, return empty array to avoid duplicate queries
    return [];
  };

  if (isAnalyzing) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Analyzing Recipe Database</h3>
          <p className="text-muted-foreground text-center mb-4">
            This may take a few minutes as we analyze all 399 recipes for duplicates,
            ingredient standardization, and migration planning...
          </p>
          <div className="w-full max-w-md">
            <Progress value={undefined} className="animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysisResult) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12">
          <Database className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Recipe Analysis Required</h3>
          <p className="text-muted-foreground text-center mb-4">
            Run a comprehensive analysis to identify duplicates and plan the migration.
          </p>
          <Button onClick={runAnalysis}>
            <TrendingUp className="h-4 w-4 mr-2" />
            Run Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const duplicateGroupsData = analysisResult.duplicateGroups
    .slice(0, 10) // Top 10 for chart
    .map(group => ({
      name: group.suggestedTemplateName.substring(0, 20) + '...',
      recipes: group.recipes.length,
      confidence: group.confidence
    }));

  const storeData = analysisResult.storeDistribution.map(store => ({
    name: store.store_name.substring(0, 10),
    recipes: store.recipe_count,
    duplicates: store.duplicate_recipes
  }));

  const phaseData = analysisResult.migrationPlan.phaseBreakdown.map(phase => ({
    name: `Phase ${phase.phase}`,
    templates: phase.templates_count,
    recipes: phase.recipes_affected,
    hours: phase.estimated_hours
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Recipe Migration Analysis</h2>
          <p className="text-muted-foreground">
            Comprehensive analysis of {analysisResult.totalRecipes} legacy recipes
          </p>
        </div>
        <Button onClick={runAnalysis} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Recipes</p>
                <p className="text-2xl font-bold">{analysisResult.totalRecipes}</p>
              </div>
              <Database className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estimated Templates</p>
                <p className="text-2xl font-bold text-green-600">
                  {analysisResult.migrationPlan.estimatedTemplates}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Recipe Reduction</p>
                <p className="text-2xl font-bold text-orange-600">
                  {analysisResult.migrationPlan.recipeReduction}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Duplicate Groups</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analysisResult.duplicateGroups.length}
                </p>
              </div>
              <Package className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Plan Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Migration Plan Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisResult.migrationPlan.phaseBreakdown.map((phase, index) => (
              <div key={phase.phase} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={index === 0 ? 'default' : index === 1 ? 'secondary' : 'outline'}>
                      Phase {phase.phase}
                    </Badge>
                    <span className="font-medium">{phase.description}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {phase.templates_count} templates • {phase.recipes_affected} recipes affected
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Estimated</div>
                    <div className="font-semibold">{phase.estimated_hours}h</div>
                  </div>
                  <Button 
                    size="sm"
                    variant={index === 0 ? 'default' : 'outline'}
                    onClick={() => onStartMigration?.(phase.phase)}
                  >
                    Start Phase
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="duplicates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="duplicates">Duplicate Analysis</TabsTrigger>
          <TabsTrigger value="ingredients">Ingredient Standardization</TabsTrigger>
          <TabsTrigger value="stores">Store Distribution</TabsTrigger>
          <TabsTrigger value="charts">Visual Analysis</TabsTrigger>
        </TabsList>

        {/* Duplicates Tab */}
        <TabsContent value="duplicates">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Duplicate Groups</CardTitle>
              <p className="text-sm text-muted-foreground">
                Found {analysisResult.duplicateGroups.length} groups of similar recipes
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.duplicateGroups.slice(0, 10).map((group, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{group.suggestedTemplateName}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            {group.recipes.length} recipes
                          </Badge>
                          <Badge 
                            variant={group.confidence >= 90 ? 'default' : group.confidence >= 70 ? 'secondary' : 'outline'}
                          >
                            {group.confidence}% confidence
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedGroup(selectedGroup === group ? null : group)}
                      >
                        {selectedGroup === group ? 'Hide Details' : 'View Details'}
                      </Button>
                    </div>

                    {selectedGroup === group && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div>
                          <h5 className="font-medium mb-2">Recipes in this group:</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {group.recipes.map(recipe => (
                              <div key={recipe.id} className="text-sm p-2 bg-muted rounded">
                                <div className="font-medium">{recipe.name}</div>
                                <div className="text-muted-foreground">
                                  {recipe.store_name} • ₱{recipe.total_cost.toFixed(2)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium mb-2">Standardized Ingredients:</h5>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {group.standardizedIngredients.slice(0, 6).map((ingredient, idx) => (
                              <div key={idx} className="text-xs p-2 bg-blue-50 rounded">
                                <div className="font-medium">{ingredient.ingredient_name}</div>
                                <div className="text-muted-foreground">
                                  ~{ingredient.average_quantity.toFixed(1)} {ingredient.unit}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ingredients Tab */}
        <TabsContent value="ingredients">
          <Card>
            <CardHeader>
              <CardTitle>Ingredient Standardization Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Found {analysisResult.ingredientAnalysis.duplicateIngredients.length} duplicate ingredients and {analysisResult.ingredientAnalysis.unitMismatches.length} unit mismatches
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Duplicate Ingredients */}
                <div>
                  <h4 className="font-semibold mb-3">Duplicate Ingredient Names</h4>
                  <div className="space-y-2">
                    {analysisResult.ingredientAnalysis.duplicateIngredients.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{item.standardName}</div>
                          <div className="text-sm text-muted-foreground">
                            Variations: {item.variations.join(', ')}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {item.usageCount} uses
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unit Mismatches */}
                <div>
                  <h4 className="font-semibold mb-3">Unit Mismatches</h4>
                  <div className="space-y-2">
                    {analysisResult.ingredientAnalysis.unitMismatches.slice(0, 10).map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="font-medium">{item.ingredient}</div>
                          <div className="text-sm text-muted-foreground">
                            Units: {item.units.join(', ')}
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div>{item.stores.length} stores</div>
                          <div className="text-muted-foreground">affected</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Distribution Tab */}
        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Distribution by Store</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysisResult.storeDistribution.map(store => (
                  <div key={store.store_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-semibold">{store.store_name}</h4>
                      <div className="text-sm text-muted-foreground">
                        {store.recipe_count} total recipes • {store.unique_recipes} unique • {store.duplicate_recipes} duplicates
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{store.recipe_count}</div>
                      <div className="text-sm text-muted-foreground">recipes</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Charts Tab */}
        <TabsContent value="charts">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Duplicate Groups Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Duplicate Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={duplicateGroupsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="recipes" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Store Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Recipes by Store</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={storeData}
                      dataKey="recipes"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {storeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Migration Timeline */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Migration Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={phaseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="templates" stroke="#8884d8" name="Templates" />
                    <Line type="monotone" dataKey="recipes" stroke="#82ca9d" name="Recipes" />
                    <Line type="monotone" dataKey="hours" stroke="#ffc658" name="Hours" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <Button 
          size="lg"
          onClick={() => onStartMigration?.(1)}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Start Migration Phase 1
        </Button>
        <Button variant="outline" size="lg">
          <AlertTriangle className="h-4 w-4 mr-2" />
          Export Analysis Report
        </Button>
      </div>
    </div>
  );
};