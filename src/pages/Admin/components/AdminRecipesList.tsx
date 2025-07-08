
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, AlertTriangle, Info, CheckCircle, XCircle, Edit } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { cleanupDuplicateRecipes } from '@/services/recipeManagement/recipeDeploymentService';
import { RecipeDeploymentEditDialog } from '@/components/Admin/components/RecipeDeploymentEditDialog';

interface AdminRecipesListProps {
  recipes: any[];
  selectedRecipes: string[];
  onSelectRecipe: (recipeId: string) => void;
  onSelectAll: () => void;
  viewMode: 'grid' | 'list';
  isLoading: boolean;
  onRefresh: () => void;
  stores: any[];
  onEnhancedDeployment?: (template: any, selectedStores: Array<{ id: string; name: string }>) => void;
}

export function AdminRecipesList({
  recipes,
  selectedRecipes,
  onSelectRecipe,
  onSelectAll,
  viewMode,
  isLoading,
  onRefresh,
  stores,
  onEnhancedDeployment
}: AdminRecipesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleCleanupDuplicates = async () => {
    setIsCleaningUp(true);
    try {
      const result = await cleanupDuplicateRecipes();
      if (result.cleaned > 0) {
        toast.success(`Cleaned up ${result.cleaned} duplicate recipes`);
        onRefresh();
      } else {
        toast.info('No duplicate recipes found');
      }
      
      if (result.errors.length > 0) {
        toast.warning(`Cleanup completed with ${result.errors.length} errors`);
        console.error('Cleanup errors:', result.errors);
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error);
      toast.error('Failed to clean up duplicates');
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Filter recipes based on search
  const filteredRecipes = recipes.filter(recipe => 
    recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (recipe.description && recipe.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (recipe.store_name && recipe.store_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group recipes to identify duplicates
  const recipeGroups = filteredRecipes.reduce((acc: any, recipe: any) => {
    const key = `${recipe.name}-${recipe.store_id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(recipe);
    return acc;
  }, {});

  const duplicateCount = Object.values(recipeGroups).filter((group: any) => group.length > 1).length;

  // Template deployment status check
  const getDeploymentStatus = (recipe: any) => {
    const hasName = recipe.name && recipe.name.trim().length > 0;
    if (!hasName) return { ready: false, reason: 'No name' };
    
    const hasIngredients = recipe.ingredients && recipe.ingredients.length > 0;
    const hasInstructions = recipe.instructions && recipe.instructions.trim().length > 0;
    
    return { 
      ready: true, 
      hasIngredients,
      hasInstructions,
      deploymentCount: recipe.deployment_count || 0,
      deployedStores: recipe.deployed_stores || [],
      warnings: [
        ...(!hasIngredients ? ['No ingredients (can be added after deployment)'] : []),
        ...(!hasInstructions ? ['No instructions'] : [])
      ]
    };
  };

  const getStatusIcon = (recipe: any) => {
    if (recipe.deployment_count > 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Package className="h-4 w-4 text-blue-600" />;
  };

  const getStatusText = (recipe: any) => {
    if (recipe.deployment_count > 0) {
      return `Deployed to ${recipe.deployment_count} store${recipe.deployment_count !== 1 ? 's' : ''}`;
    }
    return 'Template (not deployed)';
  };

  const handleEditRecipe = (recipe: any) => {
    setEditingRecipe(recipe);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    onRefresh();
    setEditingRecipe(null);
    setIsEditDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search recipes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <div className="flex gap-2">
          {duplicateCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCleanupDuplicates}
              disabled={isCleaningUp}
              className="text-orange-600 border-orange-200 hover:bg-orange-50"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {isCleaningUp ? 'Cleaning...' : `Fix ${duplicateCount} Duplicates`}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Duplicate warning */}
      {duplicateCount > 0 && (
        <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <span className="font-semibold text-orange-800">Duplicate Recipes Detected</span>
          </div>
          <p className="text-sm text-orange-700">
            Found {duplicateCount} sets of duplicate recipes. Click "Fix Duplicates" to clean them up automatically.
          </p>
        </div>
      )}

      {/* Recipe count info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Showing {filteredRecipes.length} of {recipes.length} recipes</span>
        {duplicateCount > 0 && (
          <Badge variant="outline" className="text-orange-600 border-orange-200">
            {duplicateCount} duplicate sets
          </Badge>
        )}
        <Badge variant="outline" className="text-green-600 border-green-200">
          {filteredRecipes.filter(r => getDeploymentStatus(r).ready).length} ready to deploy
        </Badge>
      </div>

      {/* Recipe Templates Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredRecipes.map((recipe) => {
          const deploymentStatus = getDeploymentStatus(recipe);
          
          return (
            <Card key={recipe.id} className={viewMode === 'list' ? 'p-4' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`select-${recipe.id}`}
                      checked={selectedRecipes.includes(recipe.id)}
                      onCheckedChange={() => onSelectRecipe(recipe.id)}
                    />
                    <div className="flex flex-col">
                      <Label htmlFor={`select-${recipe.id}`} className="cursor-pointer font-medium">
                        {recipe.name}
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        Template • {recipe.category || 'No Category'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={recipe.deployment_count > 0 ? "default" : "secondary"} className="text-xs">
                      {recipe.deployment_count > 0 ? `${recipe.deployment_count} stores` : 'Not deployed'}
                    </Badge>
                    <div className="flex items-center gap-1" title={getStatusText(recipe)}>
                      {getStatusIcon(recipe)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {recipe.description || 'No description'}
                  </div>
                  
                  {/* Template info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Ingredients: {recipe.ingredient_count || 0}</div>
                    <div>Category: {recipe.category || 'None'}</div>
                    <div>Deployments: {recipe.deployment_count || 0}</div>
                    <div>Created: {new Date(recipe.created_at).toLocaleDateString()}</div>
                  </div>

                  {/* Deployment status */}
                  <div className="p-2 border rounded text-xs">
                    <div className="flex items-center gap-1 mb-1">
                      {getStatusIcon(recipe)}
                      <span className="font-medium">
                        {getStatusText(recipe)}
                      </span>
                    </div>
                    {recipe.deployed_stores && recipe.deployed_stores.length > 0 && (
                      <div className="text-green-600">
                        Stores: {recipe.deployed_stores.join(', ')}
                      </div>
                    )}
                    {deploymentStatus.warnings && deploymentStatus.warnings.length > 0 && (
                      <div className="text-yellow-600">
                        Warnings: {deploymentStatus.warnings.join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 mt-4">
                    {recipe.deployment_count > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1"
                        onClick={() => handleEditRecipe(recipe)}
                      >
                        <Edit className="h-3 w-3" />
                        Manage Deployments
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredRecipes.length === 0 && !isLoading && (
        <div className="text-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No recipes found</h3>
          <p>
            {searchQuery 
              ? `No recipes match "${searchQuery}"`
              : "No deployed recipes available for the selected store"
            }
          </p>
        </div>
      )}

      <RecipeDeploymentEditDialog
        isOpen={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        recipe={editingRecipe}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
