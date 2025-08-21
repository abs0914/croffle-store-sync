import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  ChefHat, 
  Plus,
  Search,
  Edit,
  Trash2,
  Calculator,
  Package,
  AlertCircle
} from 'lucide-react';
import { SimplifiedRecipeForm } from '@/components/recipe/SimplifiedRecipeForm';
import { unifiedRecipeRouter, NormalizedRecipe } from '@/services/recipeManagement/unifiedRecipeRouter';
import { RecipeSystemStatus } from '@/components/Admin/components/RecipeSystemStatus';

const SimplifiedRecipeManagement: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<NormalizedRecipe | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('*').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch recipes for selected store (both systems)
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ['all_recipes', selectedStore],
    queryFn: () => unifiedRecipeRouter.getRecipesByStore(selectedStore),
    enabled: !!selectedStore
  });

  // Filter recipes based on search
  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: (data: { name: string; ingredients: any[]; target_system?: 'unified' | 'legacy' }) => 
      unifiedRecipeRouter.createRecipe({
        name: data.name,
        store_id: selectedStore,
        ingredients: data.ingredients,
        target_system: data.target_system || 'unified'
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_recipes', selectedStore] });
      setCreateDialogOpen(false);
    }
  });

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; ingredients: any[] } }) =>
      unifiedRecipeRouter.updateRecipe(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_recipes', selectedStore] });
      setEditDialogOpen(false);
      setSelectedRecipe(null);
    }
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: (id: string) => unifiedRecipeRouter.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_recipes', selectedStore] });
      setDeleteDialogOpen(false);
      setSelectedRecipe(null);
    }
  });

  const handleCreateRecipe = (data: { name: string; ingredients: any[] }) => {
    createRecipeMutation.mutate(data);
  };

  const handleUpdateRecipe = (data: { name: string; ingredients: any[] }) => {
    if (selectedRecipe) {
      updateRecipeMutation.mutate({ id: selectedRecipe.id, data });
    }
  };

  const handleDeleteRecipe = () => {
    if (selectedRecipe) {
      deleteRecipeMutation.mutate(selectedRecipe.id);
    }
  };

  const openEditDialog = (recipe: NormalizedRecipe) => {
    setSelectedRecipe(recipe);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (recipe: NormalizedRecipe) => {
    setSelectedRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <ChefHat className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Recipe Management</h1>
          <p className="text-muted-foreground">
            Create and manage recipes with inventory-based ingredients
          </p>
        </div>
      </div>

      {/* Store Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Store Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="">Select a store...</option>
            {stores.map((store: any) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {selectedStore && (
        <>
          {/* Recipe System Status */}
          <RecipeSystemStatus 
            storeId={selectedStore} 
            showFullBreakdown={false}
          />

          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Recipe
            </Button>
          </div>

          {/* Recipes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recipes ({filteredRecipes.length})</span>
                {recipes.length > 0 && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Calculator className="h-3 w-3" />
                    Total Value: ₱{recipes.reduce((sum, recipe) => sum + recipe.total_cost, 0).toFixed(2)}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Manage your store's recipes and ingredient combinations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recipesLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading recipes...
                </div>
              ) : filteredRecipes.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {searchTerm 
                      ? `No recipes found matching "${searchTerm}"` 
                      : 'No recipes created yet. Click "Create Recipe" to get started.'
                    }
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {filteredRecipes.map((recipe) => (
                    <div key={recipe.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                       <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-lg">{recipe.name}</h3>
                            <Badge 
                              variant={recipe.system_type === 'unified' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {recipe.system_type === 'unified' ? 'New System' : 'Legacy'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Package className="h-3 w-3" />
                              {recipe.ingredients?.length || 0} ingredients
                            </span>
                             <span className="flex items-center gap-1">
                               <Calculator className="h-3 w-3" />
                               ₱{recipe.total_cost.toFixed(2)} total cost
                             </span>
                          </div>
                        </div>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openEditDialog(recipe)}
                           >
                             <Edit className="h-3 w-3 mr-1" />
                             Edit
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             onClick={() => openDeleteDialog(recipe)}
                             className="text-destructive hover:text-destructive"
                           >
                             <Trash2 className="h-3 w-3" />
                           </Button>
                         </div>
                      </div>
                      
                      {/* Ingredients Summary */}
                      {recipe.ingredients && recipe.ingredients.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {recipe.ingredients.slice(0, 5).map((ingredient) => (
                            <Badge key={ingredient.id} variant="outline" className="text-xs">
                              {ingredient.ingredient_name} ({ingredient.quantity} {ingredient.unit})
                            </Badge>
                          ))}
                          {recipe.ingredients.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{recipe.ingredients.length - 5} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Create Recipe Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Recipe</DialogTitle>
          </DialogHeader>
          <SimplifiedRecipeForm
            storeId={selectedStore}
            onSave={handleCreateRecipe}
            onCancel={() => setCreateDialogOpen(false)}
            isSubmitting={createRecipeMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Recipe Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Recipe</DialogTitle>
          </DialogHeader>
          {selectedRecipe && (
            <SimplifiedRecipeForm
              recipe={{
                id: selectedRecipe.id,
                name: selectedRecipe.name,
                ingredients: selectedRecipe.ingredients?.map(ing => ({
                  inventory_stock_id: ing.inventory_stock_id,
                  ingredient_name: ing.ingredient_name,
                  quantity: ing.quantity,
                  unit: ing.unit,
                  cost_per_unit: ing.cost_per_unit
                })) || []
              }}
              storeId={selectedStore}
              onSave={handleUpdateRecipe}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedRecipe(null);
              }}
              isSubmitting={updateRecipeMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Recipe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete "{selectedRecipe?.name}"?</p>
            <p className="text-sm text-muted-foreground">
              This action cannot be undone. The recipe will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setSelectedRecipe(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteRecipe}
                disabled={deleteRecipeMutation.isPending}
              >
                {deleteRecipeMutation.isPending ? 'Deleting...' : 'Delete Recipe'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimplifiedRecipeManagement;