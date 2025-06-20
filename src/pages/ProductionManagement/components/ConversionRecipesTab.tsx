
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChefHat, Edit, Trash2 } from "lucide-react";
import { ConversionRecipe } from "@/types/inventoryManagement";
import { fetchConversionRecipes } from "@/services/inventoryManagement/inventoryConversionService";
import { CreateRecipeDialog } from "@/pages/InventoryConversion/components/CreateRecipeDialog";

export function ConversionRecipesTab() {
  const [recipes, setRecipes] = useState<ConversionRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await fetchConversionRecipes();
    setRecipes(data);
    setLoading(false);
  };

  const handleCreateSuccess = () => {
    loadRecipes();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Conversion Recipes</h2>
          <p className="text-muted-foreground">
            Manage standardized recipes for converting commissary items to store inventory
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Recipe
        </Button>
      </div>

      {/* Recipes List */}
      <div className="grid gap-4">
        {recipes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Conversion Recipes</h3>
              <p className="text-muted-foreground mb-4">
                Create standardized recipes to streamline your inventory conversions
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Recipe
              </Button>
            </CardContent>
          </Card>
        ) : (
          recipes.map((recipe) => (
            <Card key={recipe.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ChefHat className="h-5 w-5" />
                      {recipe.name}
                    </CardTitle>
                    {recipe.description && (
                      <p className="text-muted-foreground mt-1">{recipe.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Recipe Output */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      Yields: {recipe.yield_quantity} {recipe.finished_item_unit} of {recipe.finished_item_name}
                    </Badge>
                  </div>

                  {/* Ingredients */}
                  <div>
                    <h4 className="font-medium mb-2">Ingredients ({recipe.ingredients?.length || 0})</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {recipe.ingredients?.map((ingredient, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">
                            {ingredient.commissary_item?.name || 'Unknown Item'}
                          </span>
                          <Badge variant="outline">
                            {ingredient.quantity} {ingredient.commissary_item?.uom || 'units'}
                          </Badge>
                        </div>
                      )) || (
                        <p className="text-muted-foreground text-sm">No ingredients specified</p>
                      )}
                    </div>
                  </div>

                  {/* Instructions */}
                  {recipe.instructions && (
                    <div>
                      <h4 className="font-medium mb-2">Instructions</h4>
                      <p className="text-sm text-muted-foreground">{recipe.instructions}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create Recipe Dialog */}
      <CreateRecipeDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
