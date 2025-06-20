import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Package, RefreshCw, History, Plus } from "lucide-react";
import { 
  CommissaryInventoryItem, 
  InventoryStock,
  ConversionRecipe,
  MultiIngredientConversionForm
} from "@/types/inventoryManagement";
import type { InventoryConversion } from "@/types/inventoryManagement";
import { 
  fetchCommissaryItemsForConversion,
  fetchStoreInventoryForConversion,
  createMultiIngredientConversion,
  createOrFindStoreInventoryItem,
  fetchInventoryConversions,
  fetchConversionRecipes
} from "@/services/inventoryManagement/inventoryConversionService";
import { useAuth } from "@/contexts/auth";
import { useStore } from "@/contexts/StoreContext";
import { toast } from "sonner";
import { MultiIngredientConversionFormComponent } from "./InventoryConversion/components/MultiIngredientConversionForm";

export default function InventoryConversion() {
  const { user } = useAuth();
  const { currentStore } = useStore();
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [storeItems, setStoreItems] = useState<InventoryStock[]>([]);
  const [conversions, setConversions] = useState<InventoryConversion[]>([]);
  const [conversionRecipes, setConversionRecipes] = useState<ConversionRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [converting, setConverting] = useState(false);
  const [showCreateRecipe, setShowCreateRecipe] = useState(false);

  // Check if user has admin access
  const hasAdminAccess = user?.role === 'admin' || user?.role === 'owner';

  useEffect(() => {
    if (!hasAdminAccess) {
      toast.error('Access denied. Inventory conversion is only available to administrators.');
      return;
    }
    if (!currentStore?.id) {
      toast.error('Please select a store first.');
      return;
    }
    loadData();
  }, [hasAdminAccess, currentStore?.id]);

  const loadData = async () => {
    if (!currentStore?.id) return;
    
    setLoading(true);
    await Promise.all([
      loadCommissaryItems(),
      loadStoreItems(),
      loadConversions(),
      loadConversionRecipes()
    ]);
    setLoading(false);
  };

  const loadCommissaryItems = async () => {
    const data = await fetchCommissaryItemsForConversion();
    setCommissaryItems(data);
  };

  const loadStoreItems = async () => {
    if (!currentStore?.id) return;
    const data = await fetchStoreInventoryForConversion(currentStore.id);
    setStoreItems(data);
  };

  const loadConversions = async () => {
    if (!currentStore?.id) return;
    const data = await fetchInventoryConversions(currentStore.id);
    setConversions(data);
  };

  const loadConversionRecipes = async () => {
    const data = await fetchConversionRecipes();
    setConversionRecipes(data);
  };

  const handleMultiIngredientConversion = async (formData: MultiIngredientConversionForm) => {
    if (!currentStore?.id || !user?.id) {
      toast.error('Missing required information');
      return;
    }

    setConverting(true);

    try {
      let inventoryStockId = formData.inventory_stock_id;

      // If creating a new item, create it first
      if (!inventoryStockId && formData.new_item_name && formData.new_item_unit) {
        const newItem = await createOrFindStoreInventoryItem(
          currentStore.id,
          formData.new_item_name,
          formData.new_item_unit
        );
        
        if (!newItem) {
          toast.error('Failed to create new inventory item');
          return;
        }
        
        inventoryStockId = newItem.id;
        await loadStoreItems(); // Refresh store items list
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
        currentStore.id,
        user.id
      );

      if (conversion) {
        // Reload data
        await loadData();
        toast.success('Multi-ingredient conversion completed successfully');
      }
    } catch (error) {
      console.error('Conversion error:', error);
      toast.error('Failed to complete conversion');
    } finally {
      setConverting(false);
    }
  };

  if (!hasAdminAccess) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <RefreshCw className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-muted-foreground">
              Inventory conversion is only available to administrators and owners.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentStore?.id) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2">No Store Selected</h2>
            <p className="text-muted-foreground">
              Please select a store to manage inventory conversions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Inventory Conversion</h1>
        <p className="text-muted-foreground">
          Convert multiple raw materials from commissary to finished goods for {currentStore.name}
        </p>
      </div>

      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <Button
            onClick={() => setShowCreateRecipe(!showCreateRecipe)}
            variant="outline"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Recipe Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Multi-Ingredient Conversion Form */}
        <MultiIngredientConversionFormComponent
          commissaryItems={commissaryItems}
          storeItems={storeItems}
          conversionRecipes={conversionRecipes}
          onSubmit={handleMultiIngredientConversion}
          loading={converting}
        />

        {/* Recent Conversions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 rounded"></div>
                  </div>
                ))}
              </div>
            ) : conversions.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No conversions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {conversions.slice(0, 10).map((conversion) => (
                  <div key={conversion.id} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline">
                        {new Date(conversion.conversion_date).toLocaleDateString()}
                      </Badge>
                      {conversion.conversion_recipe && (
                        <Badge variant="secondary">
                          {conversion.conversion_recipe.name}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {conversion.ingredients?.length || 0} ingredients
                        </span>
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{conversion.inventory_stock?.item}</span>
                      </div>
                      
                      <div className="text-muted-foreground">
                        Produced: {conversion.finished_goods_quantity} units
                      </div>
                      
                      {conversion.ingredients && conversion.ingredients.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Used: {conversion.ingredients.map(ing => 
                            `${ing.quantity_used} ${ing.commissary_item?.uom || ''} ${ing.commissary_item?.name || ''}`
                          ).join(', ')}
                        </div>
                      )}
                      
                      {conversion.notes && (
                        <div className="text-muted-foreground italic">
                          {conversion.notes}
                        </div>
                      )}
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
