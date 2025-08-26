
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, ChefHat, Search } from "lucide-react";
import { fetchRecipes, calculateRecipeCost } from "@/services/inventoryManagement/recipeService";
import type { Recipe } from "@/types/inventoryManagement";

interface MenuRecipesTabProps {
  storeId: string;
}

export function MenuRecipesTab({ storeId }: MenuRecipesTabProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadRecipes();
  }, [storeId]);

  const loadRecipes = async () => {
    setLoading(true);
    const data = await fetchRecipes(storeId);
    setRecipes(data);
    setLoading(false);
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Menu Recipes</h2>
          <p className="text-muted-foreground">
            Recipes using store inventory for menu items and POS products
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Menu Recipe
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {filteredRecipes.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <ChefHat className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Menu Recipes</h3>
            <p className="text-muted-foreground mb-4">
              Create recipes using your store inventory to define menu items
            </p>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Recipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRecipes.map((recipe) => {
            const totalCost = calculateRecipeCost(recipe);
            const costPerServing = recipe.yield_quantity > 0 ? totalCost / recipe.yield_quantity : 0;
            
            return (
              <Card key={recipe.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    <Badge variant="outline">
                      v{recipe.version}
                    </Badge>
                  </div>
                  {recipe.description && (
                    <p className="text-sm text-muted-foreground">
                      {recipe.description}
                    </p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Yield</p>
                        <p className="font-medium">{recipe.yield_quantity} servings</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Ingredients</p>
                        <p className="font-medium">{recipe.ingredients?.length || 0} items</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Total Cost</p>
                        <p className="font-medium">₱{totalCost.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost/Serving</p>
                        <p className="font-medium">₱{costPerServing.toFixed(2)}</p>
                      </div>
                    </div>

                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Ingredients</p>
                        <div className="space-y-1">
                          {recipe.ingredients.slice(0, 3).map((ingredient, index) => (
                            <div key={index} className="text-xs text-muted-foreground">
                              {ingredient.quantity} {ingredient.unit} {ingredient.inventory_stock?.item}
                            </div>
                          ))}
                          {recipe.ingredients.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{recipe.ingredients.length - 3} more ingredients
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        Edit
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1">
                        Use
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
