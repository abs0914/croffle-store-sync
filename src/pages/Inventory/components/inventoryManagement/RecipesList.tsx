import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, Edit, Trash2, ChefHat, Calculator, Download, Upload, FileText, FileJson } from "lucide-react";
import { fetchRecipes, deleteRecipe, calculateRecipeCost } from "@/services/inventoryManagement/recipeService";
import { Recipe } from "@/types/inventoryManagement";
import { AddRecipeDialog } from "./AddRecipeDialog";
import { EditRecipeDialog } from "./EditRecipeDialog";
import { useRecipeImportExport } from "@/hooks/recipe/useRecipeImportExport";
import { toast } from "sonner";

interface RecipesListProps {
  storeId: string;
}

export function RecipesList({ storeId }: RecipesListProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedStore] = useState<string | null>(storeId);

  const {
    handleExportCSV,
    handleExportJSON,
    handleImportCSV,
    handleImportJSON,
    handleDownloadTemplate
  } = useRecipeImportExport(recipes, storeId, () => loadRecipes());

  const loadRecipes = useCallback(async () => {
    if (!selectedStore) return;
    
    setLoading(true);
    try {
      const data = await fetchRecipes(selectedStore);
      // Ensure data is an array, fallback to empty array if not
      setRecipes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading recipes:', error);
      toast.error('Failed to load recipes');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }, [selectedStore]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!confirm(`Are you sure you want to delete the recipe "${recipe.name}"?`)) return;
    
    // Pass just the recipe ID as a string
    const success = await deleteRecipe(recipe.id);
    if (success) {
      loadRecipes();
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            Recipes
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Import/Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Import/Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadTemplate}>
                  <FileText className="h-4 w-4 mr-2" />
                  Download CSV Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportCSV}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import from CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImportJSON}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Import from JSON
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportCSV} disabled={recipes.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportJSON} disabled={recipes.length === 0}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export to JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Recipe
            </Button>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="text-center py-8">
            <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No recipes found matching your search' : 'No recipes created yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecipes.map((recipe) => (
              <div key={recipe.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{recipe.name}</h3>
                      <Badge variant="outline">
                        Yield: {recipe.yield_quantity}
                      </Badge>
                    </div>
                    {recipe.description && (
                      <p className="text-sm text-muted-foreground">{recipe.description}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingRecipe(recipe)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteRecipe(recipe)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Ingredients:</p>
                    <div className="space-y-1">
                      {recipe.ingredients?.map((ingredient) => (
                        <div key={ingredient.id} className="text-sm flex justify-between">
                          <span>{ingredient.inventory_stock?.item || 'Unknown item'}</span>
                          <span>{ingredient.quantity} {ingredient.unit}</span>
                        </div>
                      )) || <span className="text-sm text-muted-foreground">No ingredients</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      Estimated Cost: ₱{calculateRecipeCost(recipe).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <AddRecipeDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        storeId={storeId}
        onSuccess={loadRecipes}
      />
      
      {editingRecipe && (
        <EditRecipeDialog
          open={!!editingRecipe}
          onOpenChange={(open) => !open && setEditingRecipe(null)}
          recipe={editingRecipe}
          storeId={storeId}
          onSuccess={loadRecipes}
        />
      )}
    </Card>
  );
}
