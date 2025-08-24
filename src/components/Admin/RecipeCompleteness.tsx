import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  auditRecipeCompleteness, 
  bulkRepairIncompleteRecipes, 
  repairIncompleteRecipe,
  type RecipeAuditResult,
  type BulkRepairSummary 
} from "@/services/recipeManagement/recipeAuditService";
import { 
  deployAndFixAllRecipeTemplates,
  fixSugboBlueberryCroffle,
  quickFixRecipeIngredients
} from "@/services/recipeManagement/enhancedDeploymentService";
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  Wrench, 
  Zap,
  RefreshCw,
  Store,
  ChefHat,
  Clock
} from "lucide-react";
import { toast } from "sonner";

export const RecipeCompleteness: React.FC = () => {
  const [auditResults, setAuditResults] = useState<RecipeAuditResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairSummary, setRepairSummary] = useState<BulkRepairSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleAuditRecipes = async () => {
    setIsLoading(true);
    try {
      const results = await auditRecipeCompleteness();
      setAuditResults(results);
      
      if (results.length === 0) {
        toast.success("🎉 All recipes are complete!");
      } else {
        toast.warning(`⚠️ Found ${results.length} incomplete recipes`);
      }
    } catch (error) {
      console.error('Audit failed:', error);
      toast.error('Failed to audit recipes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkRepair = async () => {
    setIsRepairing(true);
    try {
      const summary = await bulkRepairIncompleteRecipes();
      setRepairSummary(summary);
      
      // Refresh audit results after repair
      await handleAuditRecipes();
    } catch (error) {
      console.error('Bulk repair failed:', error);
      toast.error('Failed to repair recipes');
    } finally {
      setIsRepairing(false);
    }
  };

  const handleSingleRepair = async (recipe: RecipeAuditResult) => {
    try {
      const result = await repairIncompleteRecipe(
        recipe.recipe_id,
        recipe.template_id,
        recipe.store_id
      );
      
      if (result.success) {
        toast.success(`✅ Fixed ${recipe.recipe_name} at ${recipe.store_name}`);
        // Refresh audit results
        await handleAuditRecipes();
      } else {
        toast.error(`Failed to fix ${recipe.recipe_name}: ${result.error}`);
      }
    } catch (error) {
      console.error('Single repair failed:', error);
      toast.error('Failed to repair recipe');
    }
  };

  const handleEnhancedDeployment = async () => {
    setIsRepairing(true);
    try {
      await deployAndFixAllRecipeTemplates();
      // Refresh audit results after deployment
      await handleAuditRecipes();
    } catch (error) {
      console.error('Enhanced deployment failed:', error);
    } finally {
      setIsRepairing(false);
    }
  };

  const handleFixSugboBluberry = async () => {
    try {
      await fixSugboBlueberryCroffle();
      // Refresh audit results
      await handleAuditRecipes();
    } catch (error) {
      console.error('Failed to fix Sugbo Blueberry:', error);
    }
  };

  const filteredResults = auditResults.filter(recipe =>
    recipe.recipe_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.store_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipe Completeness Audit & Repair
          </CardTitle>
          <CardDescription>
            Identify and fix recipes with incomplete ingredient lists compared to their templates
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAuditRecipes}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              {isLoading ? 'Auditing...' : 'Audit All Recipes'}
            </Button>
            
            {auditResults.length > 0 && (
              <Button
                onClick={handleBulkRepair}
                disabled={isRepairing}
                className="flex items-center gap-2"
              >
                <Wrench className="h-4 w-4" />
                {isRepairing ? 'Repairing...' : `Fix All ${auditResults.length} Recipes`}
              </Button>
            )}
            
            <Button
              onClick={handleEnhancedDeployment}
              disabled={isRepairing}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {isRepairing ? 'Processing...' : 'Enhanced Deployment'}
            </Button>
            
            <Button
              onClick={handleFixSugboBluberry}
              disabled={isRepairing}
              variant="destructive"
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Fix Sugbo Blueberry
            </Button>
          </div>
          
          {/* Repair Summary */}
          {repairSummary && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Repair Complete:</strong> Fixed {repairSummary.recipes_repaired} of {repairSummary.incomplete_recipes_found} recipes. 
                Added {repairSummary.total_ingredients_added} ingredients and created {repairSummary.total_mappings_created} inventory mappings.
                {repairSummary.errors.length > 0 && (
                  <div className="mt-2">
                    <strong>Errors:</strong> {repairSummary.errors.length} recipes had issues (check console for details)
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Search */}
          {auditResults.length > 0 && (
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search recipes or stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Results */}
      {auditResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Incomplete Recipes ({filteredResults.length})
              </span>
              <Badge variant="destructive">{auditResults.length} Issues</Badge>
            </CardTitle>
            <CardDescription>
              Recipes missing ingredients compared to their templates
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {filteredResults.map((recipe, index) => (
                <div key={recipe.recipe_id}>
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{recipe.recipe_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          <Store className="h-3 w-3 mr-1" />
                          {recipe.store_name}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>
                          Has: {recipe.recipe_ingredients_count}/{recipe.template_ingredients_count} ingredients
                        </span>
                        <span className="text-red-500">
                          Missing: {recipe.missing_ingredients.length} ingredients
                        </span>
                      </div>
                      
                      {recipe.missing_ingredients.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          <strong>Missing:</strong> {recipe.missing_ingredients.slice(0, 3).join(', ')}
                          {recipe.missing_ingredients.length > 3 && (
                            <span> and {recipe.missing_ingredients.length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      onClick={() => handleSingleRepair(recipe)}
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Wrench className="h-3 w-3" />
                      Fix
                    </Button>
                  </div>
                  
                  {index < filteredResults.length - 1 && <Separator className="my-2" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Issues Found */}
      {auditResults.length === 0 && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Issues Found</h3>
              <p className="text-muted-foreground">
                All audited recipes have complete ingredient lists matching their templates.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};