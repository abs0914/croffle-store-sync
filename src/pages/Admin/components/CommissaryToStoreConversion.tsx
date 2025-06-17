import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, ArrowRight, Package, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CommissaryInventoryItem } from '@/types/commissary';
import { InventoryStock } from '@/types/inventory';

interface Store {
  id: string;
  name: string;
  address: string;
}

interface ConversionItem {
  commissary_item_id: string;
  commissary_item_name: string;
  quantity_to_convert: number;
  current_stock: number;
  unit: string;
}

interface RecipeProduction {
  recipe_id: string;
  recipe_name: string;
  quantity_to_produce: number;
  yield_quantity: number;
  ingredients: {
    commissary_item_id: string;
    commissary_item_name: string;
    quantity_needed: number;
    available_stock: number;
    unit: string;
  }[];
}

export const CommissaryToStoreConversion: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<CommissaryInventoryItem[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'direct' | 'recipe'>('direct');
  const [isLoading, setIsLoading] = useState(false);

  // Direct conversion state
  const [directConversion, setDirectConversion] = useState<ConversionItem>({
    commissary_item_id: '',
    commissary_item_name: '',
    quantity_to_convert: 0,
    current_stock: 0,
    unit: ''
  });
  const [conversionRatio, setConversionRatio] = useState(1);
  const [storeItemName, setStoreItemName] = useState('');
  const [storeItemUnit, setStoreItemUnit] = useState('');

  // Recipe production state
  const [selectedRecipe, setSelectedRecipe] = useState<string>('');
  const [recipeProduction, setRecipeProduction] = useState<RecipeProduction | null>(null);

  useEffect(() => {
    fetchStores();
    fetchCommissaryItems();
    fetchRecipeTemplates();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, address')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const fetchCommissaryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('commissary_inventory')
        .select('*')
        .eq('is_active', true)
        .gt('current_stock', 0)
        .order('name');

      if (error) throw error;
      
      // Cast the data to ensure proper typing with type assertions
      const typedItems = (data || []).map(item => ({
        ...item,
        category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
        unit: item.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs' | 'serving' | 'portion' | 'scoop' | 'pair'
      }));
      
      setCommissaryItems(typedItems);
    } catch (error) {
      console.error('Error fetching commissary items:', error);
      toast.error('Failed to load commissary items');
    }
  };

  const fetchRecipeTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          recipe_template_ingredients(
            *,
            commissary_inventory:commissary_item_id(*)
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error('Error fetching recipe templates:', error);
      toast.error('Failed to load recipes');
    }
  };

  const handleCommissaryItemSelect = (itemId: string) => {
    const item = commissaryItems.find(i => i.id === itemId);
    if (item) {
      setDirectConversion({
        commissary_item_id: item.id,
        commissary_item_name: item.name,
        quantity_to_convert: 0,
        current_stock: item.current_stock,
        unit: item.unit
      });
      setStoreItemName(item.name);
      setStoreItemUnit(item.unit);
    }
  };

  const handleRecipeSelect = (recipeId: string) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (recipe) {
      const production: RecipeProduction = {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        quantity_to_produce: 1,
        yield_quantity: recipe.yield_quantity,
        ingredients: recipe.recipe_template_ingredients?.map((ing: any) => ({
          commissary_item_id: ing.commissary_item_id,
          commissary_item_name: ing.commissary_item_name,
          quantity_needed: ing.quantity,
          available_stock: ing.commissary_inventory?.current_stock || 0,
          unit: ing.unit
        })) || []
      };
      setRecipeProduction(production);
      setSelectedRecipe(recipeId);
    }
  };

  const handleDirectConversion = async () => {
    if (!selectedStore || !directConversion.commissary_item_id || directConversion.quantity_to_convert <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (directConversion.quantity_to_convert > directConversion.current_stock) {
      toast.error('Insufficient commissary stock');
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Update commissary stock
      const newCommissaryStock = directConversion.current_stock - directConversion.quantity_to_convert;
      const { error: commissaryError } = await supabase
        .from('commissary_inventory')
        .update({ current_stock: newCommissaryStock })
        .eq('id', directConversion.commissary_item_id);

      if (commissaryError) throw commissaryError;

      // Find or create store inventory item
      let { data: storeItem } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', selectedStore)
        .eq('item', storeItemName)
        .eq('unit', storeItemUnit)
        .single();

      const convertedQuantity = directConversion.quantity_to_convert * conversionRatio;

      if (storeItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: storeItem.stock_quantity + convertedQuantity 
          })
          .eq('id', storeItem.id);

        if (updateError) throw updateError;
      } else {
        // Create new item
        const { data: newItem, error: createError } = await supabase
          .from('inventory_stock')
          .insert({
            store_id: selectedStore,
            item: storeItemName,
            unit: storeItemUnit,
            stock_quantity: convertedQuantity,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        storeItem = newItem;
      }

      // Log the conversion
      await supabase
        .from('inventory_conversions')
        .insert({
          store_id: selectedStore,
          commissary_item_id: directConversion.commissary_item_id,
          inventory_stock_id: storeItem.id,
          finished_goods_quantity: convertedQuantity,
          converted_by: user.id,
          notes: `Direct conversion: ${directConversion.quantity_to_convert} ${directConversion.unit} → ${convertedQuantity} ${storeItemUnit}`
        });

      toast.success('Conversion completed successfully');
      
      // Reset form
      setDirectConversion({
        commissary_item_id: '',
        commissary_item_name: '',
        quantity_to_convert: 0,
        current_stock: 0,
        unit: ''
      });
      setStoreItemName('');
      setStoreItemUnit('');
      setConversionRatio(1);
      
      // Refresh data
      await fetchCommissaryItems();

    } catch (error) {
      console.error('Error processing conversion:', error);
      toast.error('Failed to process conversion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipeProduction = async () => {
    if (!selectedStore || !recipeProduction || recipeProduction.quantity_to_produce <= 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if there's enough stock for all ingredients
    const insufficientItems = recipeProduction.ingredients.filter(ing => 
      (ing.quantity_needed * recipeProduction.quantity_to_produce) > ing.available_stock
    );

    if (insufficientItems.length > 0) {
      toast.error(`Insufficient stock for: ${insufficientItems.map(i => i.commissary_item_name).join(', ')}`);
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Deduct ingredients from commissary
      for (const ingredient of recipeProduction.ingredients) {
        const quantityToDeduct = ingredient.quantity_needed * recipeProduction.quantity_to_produce;
        const newStock = ingredient.available_stock - quantityToDeduct;

        const { error } = await supabase
          .from('commissary_inventory')
          .update({ current_stock: newStock })
          .eq('id', ingredient.commissary_item_id);

        if (error) throw error;
      }

      // Add finished goods to store inventory
      const finishedGoodsQuantity = recipeProduction.yield_quantity * recipeProduction.quantity_to_produce;
      const finishedItemName = `${recipeProduction.recipe_name} (Produced)`;

      let { data: storeItem } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', selectedStore)
        .eq('item', finishedItemName)
        .single();

      if (storeItem) {
        // Update existing item
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ 
            stock_quantity: storeItem.stock_quantity + finishedGoodsQuantity 
          })
          .eq('id', storeItem.id);

        if (updateError) throw updateError;
      } else {
        // Create new item
        const { data: newItem, error: createError } = await supabase
          .from('inventory_stock')
          .insert({
            store_id: selectedStore,
            item: finishedItemName,
            unit: 'pieces',
            stock_quantity: finishedGoodsQuantity,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        storeItem = newItem;
      }

      // Log the production
      await supabase
        .from('inventory_conversions')
        .insert({
          store_id: selectedStore,
          inventory_stock_id: storeItem.id,
          finished_goods_quantity: finishedGoodsQuantity,
          converted_by: user.id,
          notes: `Recipe production: ${recipeProduction.recipe_name} x${recipeProduction.quantity_to_produce}`
        });

      toast.success('Recipe production completed successfully');
      
      // Reset form
      setSelectedRecipe('');
      setRecipeProduction(null);
      
      // Refresh data
      await fetchCommissaryItems();

    } catch (error) {
      console.error('Error processing recipe production:', error);
      toast.error('Failed to process recipe production');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="h-6 w-6" />
            Commissary to Store Conversion
          </h2>
          <p className="text-muted-foreground">
            Convert raw materials to finished goods for store inventory
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Target Store</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger>
              <SelectValue placeholder="Select a store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map(store => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name} - {store.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'direct' | 'recipe')}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="direct" className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Direct Conversion
              </TabsTrigger>
              <TabsTrigger value="recipe" className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                Recipe Production
              </TabsTrigger>
            </TabsList>

            <TabsContent value="direct" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Commissary Item</Label>
                  <Select 
                    value={directConversion.commissary_item_id} 
                    onValueChange={handleCommissaryItemSelect}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select commissary item" />
                    </SelectTrigger>
                    <SelectContent>
                      {commissaryItems.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.current_stock} {item.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Quantity to Convert</Label>
                  <Input
                    type="number"
                    min="0"
                    max={directConversion.current_stock}
                    value={directConversion.quantity_to_convert}
                    onChange={(e) => setDirectConversion(prev => ({
                      ...prev,
                      quantity_to_convert: parseInt(e.target.value) || 0
                    }))}
                    placeholder="Enter quantity"
                  />
                  {directConversion.current_stock > 0 && (
                    <p className="text-sm text-muted-foreground">
                      Available: {directConversion.current_stock} {directConversion.unit}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Store Item Name</Label>
                  <Input
                    value={storeItemName}
                    onChange={(e) => setStoreItemName(e.target.value)}
                    placeholder="Enter store item name"
                  />
                </div>

                <div>
                  <Label>Store Item Unit</Label>
                  <Input
                    value={storeItemUnit}
                    onChange={(e) => setStoreItemUnit(e.target.value)}
                    placeholder="Enter unit"
                  />
                </div>

                <div>
                  <Label>Conversion Ratio</Label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={conversionRatio}
                    onChange={(e) => setConversionRatio(parseFloat(e.target.value) || 1)}
                    placeholder="1.0"
                  />
                  <p className="text-sm text-muted-foreground">
                    1 {directConversion.unit} = {conversionRatio} {storeItemUnit}
                  </p>
                </div>
              </div>

              {directConversion.quantity_to_convert > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800">
                    <ArrowRight className="h-4 w-4" />
                    <span className="font-medium">Conversion Preview</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-1">
                    {directConversion.quantity_to_convert} {directConversion.unit} → {(directConversion.quantity_to_convert * conversionRatio).toFixed(2)} {storeItemUnit}
                  </p>
                </div>
              )}

              <Button 
                onClick={handleDirectConversion}
                disabled={!selectedStore || !directConversion.commissary_item_id || directConversion.quantity_to_convert <= 0 || isLoading}
                className="w-full"
              >
                {isLoading ? 'Processing...' : 'Convert to Store Inventory'}
              </Button>
            </TabsContent>

            <TabsContent value="recipe" className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Recipe Template</Label>
                  <Select value={selectedRecipe} onValueChange={handleRecipeSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {recipes.map(recipe => (
                        <SelectItem key={recipe.id} value={recipe.id}>
                          {recipe.name} (Yields: {recipe.yield_quantity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {recipeProduction && (
                  <div>
                    <Label>Quantity to Produce</Label>
                    <Input
                      type="number"
                      min="1"
                      value={recipeProduction.quantity_to_produce}
                      onChange={(e) => setRecipeProduction(prev => prev ? {
                        ...prev,
                        quantity_to_produce: parseInt(e.target.value) || 1
                      } : null)}
                      placeholder="Enter quantity"
                    />
                    <p className="text-sm text-muted-foreground">
                      Will yield: {(recipeProduction.yield_quantity * recipeProduction.quantity_to_produce)} units
                    </p>
                  </div>
                )}
              </div>

              {recipeProduction && (
                <div className="space-y-4">
                  <h4 className="font-medium">Required Ingredients:</h4>
                  <div className="space-y-2">
                    {recipeProduction.ingredients.map((ingredient, index) => {
                      const required = ingredient.quantity_needed * recipeProduction.quantity_to_produce;
                      const hasEnough = ingredient.available_stock >= required;
                      
                      return (
                        <div key={index} className={`p-3 rounded-lg border ${hasEnough ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{ingredient.commissary_item_name}</span>
                            <div className="flex items-center gap-2">
                              {!hasEnough && <AlertTriangle className="h-4 w-4 text-red-500" />}
                              <span className={hasEnough ? 'text-green-700' : 'text-red-700'}>
                                Need: {required} {ingredient.unit}
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Available: {ingredient.available_stock} {ingredient.unit}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <Button 
                    onClick={handleRecipeProduction}
                    disabled={!selectedStore || !recipeProduction || recipeProduction.quantity_to_produce <= 0 || isLoading}
                    className="w-full"
                  >
                    {isLoading ? 'Processing...' : 'Produce Recipe'}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
