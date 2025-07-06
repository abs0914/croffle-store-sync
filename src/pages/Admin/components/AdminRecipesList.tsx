
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, AlertTriangle, Info } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { cleanupDuplicateRecipes } from '@/services/recipeManagement/recipeDeploymentService';

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

  const handleEnhancedDeploy = async (recipe: any) => {
    if (!onEnhancedDeployment) return;
    
    // Get available stores
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true);
    
    if (stores && stores.length > 0) {
      // For now, deploy to all stores - in production you might want a store selector
      onEnhancedDeployment(recipe, stores);
    } else {
      toast.error('No active stores found');
    }
  };

  const handleCleanupDuplicates = async () => {
    setIsCleaningUp(true);
    try {
      const result = await cleanupDuplicateRecipes();
      if (result.cleaned > 0) {
        toast.success(`Cleaned up ${result.cleaned} duplicate recipes`);
        onRefresh(); // Refresh the list
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
            Found {duplicateCount} sets of duplicate recipes. This can happen when templates are deployed multiple times to the same store.
            Click "Fix Duplicates" to clean them up automatically.
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
      </div>

      {/* Recipe Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredRecipes.map((recipe) => {
          const isDuplicate = recipeGroups[`${recipe.name}-${recipe.store_id}`]?.length > 1;
          
          return (
            <Card key={recipe.id} className={`${viewMode === 'list' ? 'p-4' : ''} ${isDuplicate ? 'border-orange-200 bg-orange-50' : ''}`}>
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
                        {recipe.store_name} • {recipe.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isDuplicate && (
                      <Badge variant="outline" className="text-orange-600 border-orange-200 text-xs">
                        Duplicate
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-xs">
                      {recipe.approval_status || 'unknown'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-2">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {recipe.description || 'No description'}
                  </div>
                  
                  {/* Recipe info */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Ingredients: {recipe.ingredients?.length || 0}</div>
                    <div>Active: {recipe.is_active ? 'Yes' : 'No'}</div>
                    <div>Product ID: {recipe.product_id ? 'Linked' : 'None'}</div>
                    <div>Created: {new Date(recipe.created_at).toLocaleDateString()}</div>
                  </div>

                  {/* Debug info for duplicates */}
                  {isDuplicate && (
                    <div className="p-2 bg-orange-100 rounded text-xs">
                      <div className="flex items-center gap-1 mb-1">
                        <Info className="h-3 w-3" />
                        <span className="font-medium">Duplicate Info:</span>
                      </div>
                      <div>Store: {recipe.store_id}</div>
                      <div>Recipe ID: {recipe.id}</div>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      onClick={() => handleEnhancedDeploy(recipe)}
                      className="flex items-center gap-1"
                      disabled={isDuplicate}
                    >
                      <Package className="h-3 w-3" />
                      {isDuplicate ? 'Duplicate' : 'Enhanced Deploy'}
                    </Button>
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
    </div>
  );
}
