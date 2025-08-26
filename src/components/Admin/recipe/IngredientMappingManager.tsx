import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Search, 
  Link, 
  Unlink, 
  CheckCircle, 
  AlertTriangle, 
  Package,
  Target,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IngredientMappingManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StoreMappingStatus {
  storeId: string;
  storeName: string;
  totalIngredients: number;
  mappedIngredients: number;
  unmappedIngredients: string[];
  mappingRate: number;
}

interface IngredientMapping {
  ingredientName: string;
  inventoryId: string | null;
  inventoryName: string | null;
  confidence: 'exact' | 'partial' | 'suggested' | 'manual' | 'unmapped';
}

export const IngredientMappingManager: React.FC<IngredientMappingManagerProps> = ({
  isOpen,
  onClose
}) => {
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [mappingStatus, setMappingStatus] = useState<StoreMappingStatus[]>([]);
  const [detailedMappings, setDetailedMappings] = useState<IngredientMapping[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStores();
      loadMappingStatus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedStoreId) {
      loadDetailedMappings(selectedStoreId);
      loadInventoryItems(selectedStoreId);
    }
  }, [selectedStoreId]);

  const loadStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);
      
      if (data && data.length > 0 && !selectedStoreId) {
        setSelectedStoreId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading stores:', error);
      toast.error('Failed to load stores');
    }
  };

  const loadMappingStatus = async () => {
    setLoading(true);
    try {
      // Get all stores with their recipe ingredient mapping status
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (storesError) throw storesError;

      const statusPromises = stores?.map(async (store) => {
        // Get all unique ingredients from recipes in this store
        const { data: recipeIngredients, error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .select('ingredient_name, recipe_id, recipes!inner(store_id)')
          .eq('recipes.store_id', store.id);

        if (ingredientsError) throw ingredientsError;

        const uniqueIngredients = Array.from(
          new Set(recipeIngredients?.map(ri => ri.ingredient_name) || [])
        );

        // Get mapped ingredients
        const { data: mappings, error: mappingsError } = await supabase
          .from('recipe_ingredient_mappings')
          .select('ingredient_name, recipe_id, recipes!inner(store_id)')
          .eq('recipes.store_id', store.id);

        if (mappingsError) throw mappingsError;

        const mappedIngredients = Array.from(
          new Set(mappings?.map(m => m.ingredient_name) || [])
        );

        const unmapped = uniqueIngredients.filter(ing => !mappedIngredients.includes(ing));

        return {
          storeId: store.id,
          storeName: store.name,
          totalIngredients: uniqueIngredients.length,
          mappedIngredients: mappedIngredients.length,
          unmappedIngredients: unmapped,
          mappingRate: uniqueIngredients.length > 0 ? 
            (mappedIngredients.length / uniqueIngredients.length) * 100 : 100
        };
      }) || [];

      const statusResults = await Promise.all(statusPromises);
      setMappingStatus(statusResults);
    } catch (error) {
      console.error('Error loading mapping status:', error);
      toast.error('Failed to load mapping status');
    } finally {
      setLoading(false);
    }
  };

  const loadDetailedMappings = async (storeId: string) => {
    try {
      // Get all recipe ingredients for this store
      const { data: recipeIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select(`
          ingredient_name,
          recipe_id,
          recipes!inner(store_id)
        `)
        .eq('recipes.store_id', storeId);

      if (ingredientsError) throw ingredientsError;

      // Process ingredients into mappings - simplified approach
      const mappingMap = new Map<string, IngredientMapping>();

      recipeIngredients?.forEach(ri => {
        const ingredientName = ri.ingredient_name;
        if (!mappingMap.has(ingredientName)) {
          mappingMap.set(ingredientName, {
            ingredientName,
            inventoryId: null,
            inventoryName: null,
            confidence: 'unmapped'
          });
        }
      });

      setDetailedMappings(Array.from(mappingMap.values()));
    } catch (error) {
      console.error('Error loading detailed mappings:', error);
      toast.error('Failed to load detailed mappings');
    }
  };

  const loadInventoryItems = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, recipe_compatible')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .eq('recipe_compatible', true)
        .order('item');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const createMapping = async (ingredientName: string, inventoryId: string) => {
    try {
      // Get all recipes that use this ingredient in the selected store
      const { data: recipeIngredients, error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .select('recipe_id, recipes!inner(store_id)')
        .eq('ingredient_name', ingredientName)
        .eq('recipes.store_id', selectedStoreId);

      if (ingredientsError) throw ingredientsError;

      // Create mappings for all recipes
      const mappingData = recipeIngredients?.map(ri => ({
        recipe_id: ri.recipe_id,
        ingredient_name: ingredientName,
        inventory_stock_id: inventoryId,
        conversion_factor: 1.0
      })) || [];

      if (mappingData.length > 0) {
        const { error: insertError } = await supabase
          .from('recipe_ingredient_mappings')
          .upsert(mappingData, {
            onConflict: 'recipe_id,ingredient_name'
          });

        if (insertError) throw insertError;

        toast.success(`Created mapping for ${ingredientName}`);
        loadDetailedMappings(selectedStoreId);
        loadMappingStatus();
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast.error(`Failed to create mapping: ${error}`);
    }
  };

  const removeMapping = async (ingredientName: string) => {
    try {
        // Get all recipes that use this ingredient in the selected store
        const { data: recipeIds, error: recipeError } = await supabase
          .from('recipes')
          .select('id')
          .eq('store_id', selectedStoreId);

        if (recipeError) throw recipeError;

        const recipeIdList = recipeIds?.map(r => r.id) || [];

        const { error } = await supabase
          .from('recipe_ingredient_mappings')
          .delete()
          .eq('ingredient_name', ingredientName)
          .in('recipe_id', recipeIdList);

      if (error) throw error;

      toast.success(`Removed mapping for ${ingredientName}`);
      loadDetailedMappings(selectedStoreId);
      loadMappingStatus();
    } catch (error) {
      console.error('Error removing mapping:', error);
      toast.error(`Failed to remove mapping: ${error}`);
    }
  };

  const runAutoMapping = async () => {
    if (!selectedStoreId) return;

    setLoading(true);
    try {
      const unmappedIngredients = detailedMappings
        .filter(m => m.confidence === 'unmapped')
        .map(m => m.ingredientName);

      let mappingsCreated = 0;

      for (const ingredientName of unmappedIngredients) {
        const lowerIngredient = ingredientName.toLowerCase();
        
        // Find best matching inventory item
        const bestMatch = inventoryItems.find(item => 
          item.item.toLowerCase() === lowerIngredient ||
          item.item.toLowerCase().includes(lowerIngredient) ||
          lowerIngredient.includes(item.item.toLowerCase())
        );

        if (bestMatch) {
          await createMapping(ingredientName, bestMatch.id);
          mappingsCreated++;
        }
      }

      toast.success(`Auto-mapped ${mappingsCreated} ingredients`);
    } catch (error) {
      console.error('Error running auto-mapping:', error);
      toast.error('Auto-mapping failed');
    } finally {
      setLoading(false);
    }
  };

  const filteredMappings = detailedMappings.filter(mapping =>
    mapping.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (mapping.inventoryName && mapping.inventoryName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Ingredient Mapping Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Store Selection */}
          <div className="flex items-center gap-4">
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.map(store => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button 
              onClick={runAutoMapping} 
              disabled={loading || !selectedStoreId}
              variant="secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Auto-Map Ingredients
            </Button>
          </div>

          {/* Mapping Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mappingStatus.map(status => (
              <Card key={status.storeId} className={selectedStoreId === status.storeId ? 'ring-2 ring-primary' : ''}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{status.storeName}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Total Ingredients:</span>
                    <span className="font-medium">{status.totalIngredients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Mapped:</span>
                    <span className="font-medium text-green-600">{status.mappedIngredients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unmapped:</span>
                    <span className="font-medium text-red-600">{status.unmappedIngredients.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Coverage:</span>
                    <Badge variant={status.mappingRate >= 80 ? 'default' : status.mappingRate >= 50 ? 'secondary' : 'destructive'}>
                      {status.mappingRate.toFixed(1)}%
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Mappings */}
          {selectedStoreId && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Ingredient Mappings</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Search ingredients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredMappings.map((mapping, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3 flex-1">
                        <Badge 
                          variant={mapping.confidence === 'exact' ? 'default' : 
                                 mapping.confidence === 'partial' ? 'secondary' : 
                                 mapping.confidence === 'suggested' ? 'outline' : 'destructive'}
                        >
                          {mapping.confidence === 'unmapped' ? 'None' : 
                           mapping.confidence.charAt(0).toUpperCase() + mapping.confidence.slice(1)}
                        </Badge>
                        
                        <div className="flex-1">
                          <div className="font-medium">{mapping.ingredientName}</div>
                          {mapping.inventoryName && (
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              {mapping.inventoryName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {mapping.confidence === 'unmapped' ? (
                          <Select 
                            onValueChange={(value) => createMapping(mapping.ingredientName, value)}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="Select inventory item" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventoryItems
                                .filter(item => 
                                  item.item.toLowerCase().includes(mapping.ingredientName.toLowerCase()) ||
                                  mapping.ingredientName.toLowerCase().includes(item.item.toLowerCase())
                                )
                                .slice(0, 10)
                                .map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.item} ({item.unit})
                                </SelectItem>
                              ))}
                              {inventoryItems.length > 10 && (
                                <SelectItem value="" disabled>
                                  ... and {inventoryItems.length - 10} more
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeMapping(mapping.ingredientName)}
                          >
                            <Unlink className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredMappings.length === 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        No ingredients found for the selected store.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};