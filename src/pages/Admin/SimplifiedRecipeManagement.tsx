import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  AlertCircle,
  Filter,
  CheckCircle,
  Clock,
  ShoppingCart,
  Download,
  Upload,
  FileText,
  MoreVertical
} from 'lucide-react';
import { SimplifiedRecipeForm } from '@/components/recipe/SimplifiedRecipeForm';
import { unifiedRecipeService, UnifiedRecipe as ServiceUnifiedRecipe } from '@/services/unifiedRecipeService';
import { useRecipeProductIntegration } from '@/hooks/useRecipeProductIntegration';
import { RecipeStatusIndicator } from '@/components/RecipeManagement/RecipeStatusIndicator';
import { useUnifiedRecipeImportExport } from '@/hooks/useUnifiedRecipeImportExport';
import { useInventoryStockImportExport } from '@/pages/Inventory/components/inventoryStock/hooks/useInventoryStockImportExport';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface UnifiedRecipe {
  id: string;
  name: string;
  store_id: string;
  total_cost: number;
  cost_per_serving: number;
  serving_size: number;
  is_active: boolean;
  ingredients?: Array<{
    id: string;
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
    inventory_stock_id: string;
  }>;
}

const SimplifiedRecipeManagement: React.FC = () => {
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<UnifiedRecipe | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch stores
  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('*').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch recipes for selected store (unified system only)
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ['unified_recipes', selectedStore],
    queryFn: () => unifiedRecipeService.getRecipesByStore(selectedStore),
    enabled: !!selectedStore
  });

  // Recipe-Product Integration for status tracking
  const {
    productStatuses,
    recipeStatuses,
    summary,
    isLoading: statusLoading,
    syncCatalog,
    refetch: refetchStatuses
  } = useRecipeProductIntegration(selectedStore || null);

  // Fetch inventory for export
  const { data: inventoryStock = [] } = useQuery({
    queryKey: ['inventory-stock', selectedStore],
    queryFn: async () => {
      if (!selectedStore) return [];
      const { data } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', selectedStore)
        .eq('is_active', true);
      return data || [];
    },
    enabled: !!selectedStore
  });

  // Import/Export hooks
  const recipeImportExport = useUnifiedRecipeImportExport(recipes, selectedStore);
  const inventoryImportExport = useInventoryStockImportExport(inventoryStock);

  // Get recipe status using recipe-first approach
  const getRecipeStatus = (recipeId: string) => {
    const recipeStatus = recipeStatuses.find(r => r.recipeId === recipeId);
    if (recipeStatus) {
      // Map recipe status to product status format for compatibility
      return recipeStatus.status === 'missing_ingredients' ? 'setup_needed' : recipeStatus.status;
    }
    return 'setup_needed';
  };

  // Get recipe data for display
  const getRecipeData = (recipeId: string) => {
    return recipeStatuses.find(r => r.recipeId === recipeId);
  };

  // Filter recipes based on search and status
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'all') return matchesSearch;
    
    const recipeStatus = getRecipeStatus(recipe.id);
    return matchesSearch && recipeStatus === statusFilter;
  });

  // Create recipe mutation
  const createRecipeMutation = useMutation({
    mutationFn: (data: { name: string; ingredients: any[] }) => 
      unifiedRecipeService.createRecipe({
        name: data.name,
        store_id: selectedStore,
        ingredients: data.ingredients
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_recipes', selectedStore] });
      setCreateDialogOpen(false);
      toast.success('Recipe created successfully');
    },
    onError: () => {
      toast.error('Failed to create recipe');
    }
  });

  // Update recipe mutation
  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; ingredients: any[] } }) =>
      unifiedRecipeService.updateRecipe(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_recipes', selectedStore] });
      setEditDialogOpen(false);
      setSelectedRecipe(null);
      toast.success('Recipe updated successfully');
    },
    onError: () => {
      toast.error('Failed to update recipe');
    }
  });

  // Delete recipe mutation
  const deleteRecipeMutation = useMutation({
    mutationFn: (id: string) => unifiedRecipeService.deleteRecipe(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unified_recipes', selectedStore] });
      setDeleteDialogOpen(false);
      setSelectedRecipe(null);
      toast.success('Recipe deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete recipe');
    }
  });

  // Deploy recipe mutation
  const deployRecipeMutation = useMutation({
    mutationFn: async () => {
      return await syncCatalog();
    },
    onSuccess: () => {
      refetchStatuses();
      queryClient.invalidateQueries({ queryKey: ['unified_recipes', selectedStore] });
      toast.success('Recipe deployed to product catalog successfully');
    },
    onError: (error) => {
      console.error('Deployment error:', error);
      toast.error('Failed to deploy recipe to product catalog');
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

  const openEditDialog = (recipe: UnifiedRecipe) => {
    setSelectedRecipe(recipe);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (recipe: UnifiedRecipe) => {
    setSelectedRecipe(recipe);
    setDeleteDialogOpen(true);
  };

  const handleDeployRecipe = () => {
    deployRecipeMutation.mutate();
  };

  const isRecipeDeployed = (recipeId: string) => {
    const recipeData = getRecipeData(recipeId);
    return recipeData?.isLinkedToProduct || false;
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
          {/* Actions Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search recipes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recipes</SelectItem>
                  <SelectItem value="ready_to_sell">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Ready to Sell
                    </div>
                  </SelectItem>
                  <SelectItem value="setup_needed">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      Setup Needed
                    </div>
                  </SelectItem>
                  <SelectItem value="direct_product">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-blue-500" />
                      Direct Product
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              {/* Import/Export Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4 mr-2" />
                    Import/Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={recipeImportExport.handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Recipes (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={recipeImportExport.handleImportCSV}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Recipes (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={recipeImportExport.handleDownloadTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Recipe Template
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={inventoryImportExport.handleExportCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Inventory (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={inventoryImportExport.handleImportClick}>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Inventory (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={inventoryImportExport.handleDownloadTemplate}>
                    <FileText className="h-4 w-4 mr-2" />
                    Download Inventory Template
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Recipe
              </Button>
            </div>
          </div>

          {/* Recipes List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Recipes ({filteredRecipes.length}{filteredRecipes.length !== recipes.length ? ` of ${recipes.length}` : ''})</span>
                <div className="flex items-center gap-2">
                  {summary.total > 0 && (
                    <>
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {summary.recipesReady} Ready
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-yellow-500" />
                        {summary.recipesSetupNeeded} Setup Needed
                      </Badge>
                    </>
                  )}
                  {recipes.length > 0 && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Calculator className="h-3 w-3" />
                      ₱{recipes.reduce((sum, recipe) => sum + recipe.total_cost, 0).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </CardTitle>
              <CardDescription>
                Manage your store's recipes with real-time production status
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
                  {filteredRecipes.map((recipe) => {
                    const recipeStatus = getRecipeStatus(recipe.id);
                    const recipeData = getRecipeData(recipe.id);
                    
                    return (
                      <div key={recipe.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-lg">{recipe.name}</h3>
                              <RecipeStatusIndicator 
                                status={recipeStatus}
                                canProduce={recipeData?.canProduce || false}
                                availableIngredients={recipeData?.availableIngredients || 0}
                                totalIngredients={recipeData?.totalIngredients || 0}
                              />
                              {recipeData?.isLinkedToProduct && (
                                <Badge variant="outline" className="text-xs">
                                  <ShoppingCart className="h-3 w-3 mr-1" />
                                  Linked to Product
                                </Badge>
                              )}
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
                              {recipeData && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  {recipeData.availableIngredients}/{recipeData.totalIngredients} available
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Deploy Button */}
                            {isRecipeDeployed(recipe.id) ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="text-green-600 border-green-200 bg-green-50 hover:bg-green-50"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Deployed
                              </Button>
                            ) : recipeStatus === 'ready_to_sell' ? (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={handleDeployRecipe}
                                disabled={deployRecipeMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                {deployRecipeMutation.isPending ? 'Deploying...' : 'Deploy'}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                className="text-muted-foreground"
                                title="Fix missing ingredients to enable deployment"
                              >
                                <ShoppingCart className="h-3 w-3 mr-1" />
                                Deploy
                              </Button>
                            )}
                            
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
                        
                        {/* Missing Ingredients Info */}
                        {recipeData?.missingIngredients && recipeData.missingIngredients.length > 0 && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 font-medium mb-1">Missing ingredients:</p>
                            <div className="flex flex-wrap gap-1">
                              {recipeData.missingIngredients.slice(0, 3).map((ingredient, index) => (
                                <Badge key={index} variant="outline" className="text-xs bg-yellow-100 dark:bg-yellow-900/40">
                                  {ingredient}
                                </Badge>
                              ))}
                              {recipeData.missingIngredients.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{recipeData.missingIngredients.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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