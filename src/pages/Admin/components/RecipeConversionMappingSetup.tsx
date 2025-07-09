import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Link, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Settings, 
  Package,
  Target
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  item: string;
  unit: string;
  stock_quantity: number;
  store_id: string;
}

interface RecipeIngredient {
  ingredient_name: string;
  unit: string;
  usage_count: number;
}

interface ConversionMapping {
  id: string;
  inventory_stock_id: string;
  recipe_ingredient_name: string;
  recipe_ingredient_unit: string;
  conversion_factor: number;
  notes?: string;
  inventory_stock?: InventoryItem;
}

interface Store {
  id: string;
  name: string;
  inventory_count: number;
  has_mappings: boolean;
}

export const RecipeConversionMappingSetup: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>('');
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [recipeIngredients, setRecipeIngredients] = useState<RecipeIngredient[]>([]);
  const [mappings, setMappings] = useState<ConversionMapping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [setupProgress, setSetupProgress] = useState(0);

  // Form state for creating mappings
  const [formData, setFormData] = useState({
    inventory_stock_id: '',
    recipe_ingredient_name: '',
    recipe_ingredient_unit: '',
    conversion_factor: 1
  });

  useEffect(() => {
    loadStoresData();
    loadRecipeIngredients();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadStoreInventory(selectedStore);
      loadStoreMappings(selectedStore);
    }
  }, [selectedStore]);

  const loadStoresData = async () => {
    try {
      const { data: storesData } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');

      const { data: inventoryData } = await supabase
        .from('inventory_stock')
        .select('store_id')
        .eq('is_active', true);

      const { data: mappingsData } = await supabase
        .from('inventory_conversion_mappings')
        .select('inventory_stock_id, inventory_stock(store_id)')
        .eq('is_active', true);

      const inventoryCounts = inventoryData?.reduce((acc: any, item) => {
        acc[item.store_id] = (acc[item.store_id] || 0) + 1;
        return acc;
      }, {}) || {};

      const mappingCounts = mappingsData?.reduce((acc: any, mapping) => {
        const storeId = (mapping.inventory_stock as any)?.store_id;
        if (storeId) {
          acc[storeId] = (acc[storeId] || 0) + 1;
        }
        return acc;
      }, {}) || {};

      const enrichedStores = storesData?.map(store => ({
        ...store,
        inventory_count: inventoryCounts[store.id] || 0,
        has_mappings: (mappingCounts[store.id] || 0) > 0
      })) || [];

      setStores(enrichedStores);
    } catch (error) {
      console.error('Error loading stores data:', error);
      toast.error('Failed to load stores data');
    }
  };

  const loadRecipeIngredients = async () => {
    try {
      const { data } = await supabase
        .from('recipe_template_ingredients')
        .select('ingredient_name, unit')
        .not('ingredient_name', 'is', null);

      if (data) {
        const ingredientMap = new Map();
        data.forEach(item => {
          const key = `${item.ingredient_name}-${item.unit}`;
          ingredientMap.set(key, {
            ingredient_name: item.ingredient_name,
            unit: item.unit,
            usage_count: (ingredientMap.get(key)?.usage_count || 0) + 1
          });
        });
        
        const ingredients = Array.from(ingredientMap.values())
          .sort((a, b) => b.usage_count - a.usage_count);
        
        setRecipeIngredients(ingredients);
      }
    } catch (error) {
      console.error('Error loading recipe ingredients:', error);
    }
  };

  const loadStoreInventory = async (storeId: string) => {
    try {
      const { data } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('item');

      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading store inventory:', error);
    }
  };

  const loadStoreMappings = async (storeId: string) => {
    try {
      const { data } = await supabase
        .from('inventory_conversion_mappings')
        .select(`
          *,
          inventory_stock(*)
        `)
        .eq('inventory_stock.store_id', storeId)
        .eq('is_active', true);

      setMappings(data || []);
    } catch (error) {
      console.error('Error loading store mappings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createMapping = async () => {
    if (!formData.inventory_stock_id || !formData.recipe_ingredient_name || !formData.conversion_factor) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('inventory_conversion_mappings')
        .insert({
          inventory_stock_id: formData.inventory_stock_id,
          recipe_ingredient_name: formData.recipe_ingredient_name,
          recipe_ingredient_unit: formData.recipe_ingredient_unit,
          conversion_factor: formData.conversion_factor,
          is_active: true
        });

      if (error) throw error;

      toast.success('Conversion mapping created successfully');
      setFormData({
        inventory_stock_id: '',
        recipe_ingredient_name: '',
        recipe_ingredient_unit: '',
        conversion_factor: 1
      });
      
      if (selectedStore) {
        loadStoreMappings(selectedStore);
        loadStoresData(); // Refresh store status
      }
    } catch (error: any) {
      console.error('Error creating mapping:', error);
      if (error.code === '23505') {
        toast.error('A mapping already exists for this combination');
      } else {
        toast.error('Failed to create mapping');
      }
    }
  };

  const createAutoMappings = async () => {
    if (!selectedStore) return;

    setIsSetupDialogOpen(true);
    setSetupProgress(0);

    try {
      const commonMappings = [
        { inventory: 'Chocolate Sauce', recipe: 'Chocolate Sauce', factor: 1 },
        { inventory: 'Whipped Cream', recipe: 'Whipped Cream', factor: 1 },
        { inventory: 'Regular Croissant', recipe: 'Croissant', factor: 1 },
        { inventory: 'Regular Croissant', recipe: 'Regular Croissant', factor: 1 },
        { inventory: 'Nutella Sauce', recipe: 'Nutella Sauce', factor: 1 },
        { inventory: 'Caramel Sauce', recipe: 'Caramel Sauce', factor: 1 },
        { inventory: 'Dark Chocolate Sauce', recipe: 'Dark Chocolate Sauce', factor: 1 },
        { inventory: 'Strawberry Jam pack', recipe: 'Strawberry Jam', factor: 1 },
        { inventory: 'Mango Jam pack', recipe: 'Mango Jam', factor: 1 },
        { inventory: 'Blueberry Jam pack', recipe: 'Blueberry Jam', factor: 1 },
        { inventory: 'Tiramisu Sauce', recipe: 'Tiramisu Sauce', factor: 1 },
        { inventory: 'Biscoff pack', recipe: 'Biscoff Biscuit', factor: 1 },
        { inventory: 'Kitkat pack', recipe: 'Kitkat', factor: 1 },
        { inventory: 'Oreo Cookie pack', recipe: 'Oreo Cookie', factor: 1 },
        { inventory: 'Marshmallows pack', recipe: 'Marshmallow', factor: 1 },
        { inventory: 'Graham Crushed pack', recipe: 'Crushed Grahams', factor: 1 },
        { inventory: 'Matcha Crumbs pack', recipe: 'Matcha Powder', factor: 1 },
        { inventory: 'Chopsticks pack of 100', recipe: 'Chopstick', factor: 100 },
        { inventory: 'Take -out box w/ cover pack of 25', recipe: 'Take out Box', factor: 25 },
        { inventory: 'Wax Paper pack', recipe: 'Waxpaper', factor: 1 }
      ];

      let completed = 0;
      const total = commonMappings.length;

      for (const mapping of commonMappings) {
        try {
          // Find inventory item
          const inventoryItem = inventoryItems.find(item => 
            item.item.toLowerCase().includes(mapping.inventory.toLowerCase())
          );

          if (inventoryItem) {
            // Check if mapping already exists
            const { data: existing } = await supabase
              .from('inventory_conversion_mappings')
              .select('id')
              .eq('inventory_stock_id', inventoryItem.id)
              .eq('recipe_ingredient_name', mapping.recipe)
              .eq('is_active', true)
              .maybeSingle();

            if (!existing) {
              await supabase
                .from('inventory_conversion_mappings')
                .insert({
                  inventory_stock_id: inventoryItem.id,
                  recipe_ingredient_name: mapping.recipe,
                  recipe_ingredient_unit: 'piece',
                  conversion_factor: mapping.factor,
                  notes: `Auto-created mapping for ${mapping.recipe}`,
                  is_active: true
                });
            }
          }
        } catch (error) {
          console.error(`Error creating mapping for ${mapping.recipe}:`, error);
        }

        completed++;
        setSetupProgress((completed / total) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast.success(`Created ${completed} conversion mappings`);
      loadStoreMappings(selectedStore);
      loadStoresData();
      
    } catch (error) {
      console.error('Error creating auto mappings:', error);
      toast.error('Failed to create auto mappings');
    } finally {
      setIsSetupDialogOpen(false);
      setSetupProgress(0);
    }
  };

  const getMappingCoverage = () => {
    if (recipeIngredients.length === 0) return 0;
    const mappedIngredients = new Set(mappings.map(m => m.recipe_ingredient_name));
    const covered = recipeIngredients.filter(ing => mappedIngredients.has(ing.ingredient_name)).length;
    return Math.round((covered / recipeIngredients.length) * 100);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recipe Conversion Mapping Setup</h2>
          <p className="text-muted-foreground">
            Create mappings between recipe ingredients and inventory items for accurate deductions
          </p>
        </div>
      </div>

      {/* Store Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stores.map(store => (
          <Card key={store.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedStore(store.id)}>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{store.name}</h3>
                  {store.has_mappings ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {store.inventory_count} inventory items
                </div>
                <Badge variant={store.has_mappings ? 'default' : 'secondary'}>
                  {store.has_mappings ? 'Has Mappings' : 'No Mappings'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedStore && (
        <>
          {/* Store Details */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Store: {stores.find(s => s.id === selectedStore)?.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={createAutoMappings} variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Auto-Create Mappings
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Manual Mapping
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Conversion Mapping</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Inventory Item</label>
                          <Select value={formData.inventory_stock_id} onValueChange={(value) => 
                            setFormData(prev => ({ ...prev, inventory_stock_id: value }))}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select inventory item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item} ({item.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Recipe Ingredient</label>
                          <Select value={formData.recipe_ingredient_name} onValueChange={(value) => {
                            const ingredient = recipeIngredients.find(i => i.ingredient_name === value);
                            setFormData(prev => ({ 
                              ...prev, 
                              recipe_ingredient_name: value,
                              recipe_ingredient_unit: ingredient?.unit || 'piece'
                            }));
                          }}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select recipe ingredient" />
                            </SelectTrigger>
                            <SelectContent>
                              {recipeIngredients.map((ingredient, index) => (
                                <SelectItem key={index} value={ingredient.ingredient_name}>
                                  {ingredient.ingredient_name} ({ingredient.unit}) - Used {ingredient.usage_count}x
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Conversion Factor</label>
                          <Input
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={formData.conversion_factor}
                            onChange={(e) => setFormData(prev => ({ 
                              ...prev, 
                              conversion_factor: parseFloat(e.target.value) || 1 
                            }))}
                            placeholder="e.g., 12 (if 1 pack = 12 pieces)"
                          />
                        </div>
                        <Button onClick={createMapping} className="w-full">
                          Create Mapping
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mapping Coverage:</span>
                  <Badge variant={getMappingCoverage() > 50 ? 'default' : 'secondary'}>
                    {getMappingCoverage()}% covered
                  </Badge>
                </div>
                <Progress value={getMappingCoverage()} className="w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Current Mappings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="h-5 w-5" />
                Current Mappings ({mappings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mappings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No conversion mappings found</p>
                  <p className="text-sm">Use auto-create or add manual mappings to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Inventory Item</TableHead>
                        <TableHead>Recipe Ingredient</TableHead>
                        <TableHead>Conversion</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mappings.map((mapping) => (
                        <TableRow key={mapping.id}>
                        <TableCell>
                          {mapping.inventory_stock?.item} ({mapping.inventory_stock?.unit})
                        </TableCell>
                        <TableCell>
                          {mapping.recipe_ingredient_name} ({mapping.recipe_ingredient_unit})
                        </TableCell>
                        <TableCell>
                          1 {mapping.inventory_stock?.unit} = {mapping.conversion_factor} {mapping.recipe_ingredient_unit}
                        </TableCell>
                          <TableCell>{mapping.notes || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Auto-setup Dialog */}
      <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Creating Conversion Mappings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Setting up automatic mappings between common ingredients and inventory items...
            </p>
            <Progress value={setupProgress} className="w-full" />
            <p className="text-xs text-center">{Math.round(setupProgress)}% Complete</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};