
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Factory, ArrowRight, Package } from "lucide-react";
import { 
  fetchConversionRecipes,
  fetchCommissaryItemsForConversion,
  fetchStoreInventoryForConversion 
} from "@/services/inventoryManagement/inventoryConversionService";
import { MultiIngredientConversionFormComponent } from "@/pages/InventoryConversion/components/MultiIngredientConversionForm";
import type { 
  ConversionRecipe, 
  CommissaryInventoryItem, 
  InventoryStock,
  MultiIngredientConversionForm 
} from "@/types/inventoryManagement";
import { useAuth } from "@/contexts/auth";
import { createMultiIngredientConversion, createOrFindStoreInventoryItem } from "@/services/inventoryManagement/inventoryConversionService";
import { toast } from "sonner";

interface ConversionRecipesTabProps {
  storeId: string;
}

export function ConversionRecipesTab({ storeId }: ConversionRecipesTabProps) {
  const { user } = useAuth();
  const [conversionRecipes, setConversionRecipes] = useState<ConversionRecipe[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<InventoryStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadData();
  }, [storeId]);

  const loadData = async () => {
    setLoading(true);
    const [recipes, commissary, store] = await Promise.all([
      fetchConversionRecipes(),
      fetchCommissaryItemsForConversion(),
      fetchStoreInventoryForConversion(storeId)
    ]);
    
    setConversionRecipes(recipes);
    setCommissaryItems(commissary);
    setStoreItems(store);
    setLoading(false);
  };

  const handleConversion = async (formData: MultiIngredientConversionForm) => {
    if (!user?.id) {
      toast.error('Authentication required');
      return;
    }

    setConverting(true);

    try {
      let inventoryStockId = formData.inventory_stock_id;

      // If creating a new item, create it first
      if (!inventoryStockId && formData.new_item_name && formData.new_item_unit) {
        const newItem = await createOrFindStoreInventoryItem(
          storeId,
          formData.new_item_name,
          formData.new_item_unit
        );
        
        if (!newItem) {
          toast.error('Failed to create new inventory item');
          return;
        }
        
        inventoryStockId = newItem.id;
        await loadData(); // Refresh data
      }

      if (!inventoryStockId) {
        toast.error('Please select or create a target inventory item');
        return;
      }

      const conversionData = {
        ...formData,
        inventory_stock_id: inventoryStockId
      };

      const conversion = await createMultiIngredientConversion(
        conversionData,
        storeId,
        user.id
      );

      if (conversion) {
        await loadData();
        toast.success('Production conversion completed successfully');
      }
    } catch (error) {
      console.error('Production conversion error:', error);
      toast.error('Failed to complete production conversion');
    } finally {
      setConverting(false);
    }
  };

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
          <h2 className="text-2xl font-bold">Production Conversion Workflows</h2>
          <p className="text-muted-foreground">
            Execute production conversions from commissary raw materials to store inventory items
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Conversion Workflow
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Conversion Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              Execute Production Conversion
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Convert commissary raw materials into store-ready products
            </p>
          </CardHeader>
          <CardContent>
            <MultiIngredientConversionFormComponent
              commissaryItems={commissaryItems}
              storeItems={storeItems}
              conversionRecipes={conversionRecipes}
              onSubmit={handleConversion}
              loading={converting}
            />
          </CardContent>
        </Card>

        {/* Production Workflow Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Production Workflow Templates
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Pre-defined conversion workflows for consistent production
            </p>
          </CardHeader>
          <CardContent>
            {conversionRecipes.length === 0 ? (
              <div className="text-center py-8">
                <Factory className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No production workflows yet</p>
                <p className="text-sm text-muted-foreground">
                  Create templates to streamline repeated production conversions
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversionRecipes.map((recipe) => (
                  <div key={recipe.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{recipe.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {recipe.description}
                        </p>
                      </div>
                      <Badge variant="outline">
                        Yields {recipe.yield_quantity} {recipe.finished_item_unit}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{recipe.ingredients?.length || 0} commissary ingredients</span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="font-medium">{recipe.finished_item_name}</span>
                    </div>
                    
                    {recipe.ingredients && recipe.ingredients.length > 0 && (
                      <div className="mt-3 text-xs text-muted-foreground">
                        Uses: {recipe.ingredients.map(ing => 
                          `${ing.quantity} ${ing.commissary_item?.unit || ''} ${ing.commissary_item?.name || ''}`
                        ).join(', ')}
                      </div>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline">
                        Use Workflow
                      </Button>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
