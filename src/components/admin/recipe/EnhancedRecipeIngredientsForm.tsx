import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Plus, 
  Trash2, 
  Users, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  GripVertical,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { IngredientGroupDialog } from './IngredientGroupDialog';

interface IngredientGroup {
  id: string;
  name: string;
  type: 'required_one' | 'optional_one' | 'multiple';
  isCollapsed: boolean;
  ingredients: EnhancedIngredient[];
}

interface EnhancedIngredient {
  id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  notes?: string;
  inventory_stock_id?: string;
  commissary_item_id?: string;
  ingredient_group_id?: string;
  ingredient_group_name?: string;
  group_selection_type?: 'required_one' | 'optional_one' | 'multiple';
  is_optional?: boolean;
  display_order?: number;
  isNew?: boolean;
}

interface EnhancedRecipeIngredientsFormProps {
  ingredients: EnhancedIngredient[];
  onChange: (ingredients: EnhancedIngredient[]) => void;
  storeId?: string;
  isTemplate?: boolean;
}

export function EnhancedRecipeIngredientsForm({ 
  ingredients, 
  onChange, 
  storeId, 
  isTemplate 
}: EnhancedRecipeIngredientsFormProps) {
  const [inventoryStock, setInventoryStock] = useState<any[]>([]);
  const [commissaryItems, setCommissaryItems] = useState<any[]>([]);
  const [ingredientGroups, setIngredientGroups] = useState<IngredientGroup[]>([]);
  const [showGroupDialog, setShowGroupDialog] = useState(false);

  useEffect(() => {
    if (storeId && !isTemplate) {
      loadInventoryStock();
    } else if (isTemplate) {
      loadCommissaryItems();
    }
  }, [storeId, isTemplate]);

  useEffect(() => {
    organizeIngredientsIntoGroups();
  }, [ingredients]);

  const loadInventoryStock = async () => {
    if (!storeId) return;

    try {
      const { data } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('item');

      setInventoryStock(data || []);
    } catch (error) {
      console.error('Error loading inventory stock:', error);
      toast.error('Failed to load inventory items');
    }
  };

  const loadCommissaryItems = async () => {
    try {
      const { data } = await supabase
        .from('commissary_inventory')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setCommissaryItems(data || []);
    } catch (error) {
      console.error('Error loading commissary items:', error);
      toast.error('Failed to load commissary items');
    }
  };

  const organizeIngredientsIntoGroups = () => {
    const groupsMap = new Map<string, IngredientGroup>();
    const ungroupedIngredients: EnhancedIngredient[] = [];

    // Create groups and organize ingredients
    ingredients.forEach((ingredient) => {
      if (ingredient.ingredient_group_id && ingredient.ingredient_group_name) {
        const groupId = ingredient.ingredient_group_id;
        
        if (!groupsMap.has(groupId)) {
          groupsMap.set(groupId, {
            id: groupId,
            name: ingredient.ingredient_group_name,
            type: ingredient.group_selection_type || 'multiple',
            isCollapsed: false,
            ingredients: []
          });
        }
        
        groupsMap.get(groupId)!.ingredients.push(ingredient);
      } else {
        ungroupedIngredients.push(ingredient);
      }
    });

    // Add ungrouped ingredients as individual group
    if (ungroupedIngredients.length > 0) {
      groupsMap.set('ungrouped', {
        id: 'ungrouped',
        name: 'Individual Ingredients',
        type: 'multiple',
        isCollapsed: false,
        ingredients: ungroupedIngredients
      });
    }

    setIngredientGroups(Array.from(groupsMap.values()));
  };

  const handleCreateGroup = (groupData: Omit<{ id: string; name: string; selectionType: 'required_one' | 'optional_one' | 'multiple'; isOptional: boolean; displayOrder: number; }, 'id'>) => {
    const groupId = `group-${Date.now()}`;
    const newGroup: IngredientGroup = {
      id: groupId,
      name: groupData.name,
      type: groupData.selectionType,
      isCollapsed: false,
      ingredients: []
    };

    setIngredientGroups(prev => [...prev, newGroup]);
    toast.success(`Group "${newGroup.name}" created successfully`);
  };

  const addIngredientToGroup = (groupId: string) => {
    const group = ingredientGroups.find(g => g.id === groupId);
    if (!group) return;

    const newIngredient: EnhancedIngredient = {
      id: `temp-${Date.now()}`,
      ingredient_name: '',
      quantity: 1,
      unit: 'g',
      cost_per_unit: 0,
      notes: '',
      inventory_stock_id: '',
      commissary_item_id: '',
      ingredient_group_id: groupId === 'ungrouped' ? undefined : groupId,
      ingredient_group_name: groupId === 'ungrouped' ? undefined : group.name,
      group_selection_type: groupId === 'ungrouped' ? undefined : group.type,
      is_optional: group.type === 'optional_one',
      display_order: group.ingredients.length,
      isNew: true
    };

    const updatedIngredients = [...ingredients, newIngredient];
    onChange(updatedIngredients);
  };

  const updateIngredient = (ingredientId: string, field: keyof EnhancedIngredient, value: any) => {
    const updatedIngredients = ingredients.map(ingredient => {
      if (ingredient.id === ingredientId) {
        const updated = { ...ingredient, [field]: value };

        // Auto-fill data when item is selected
        if (field === 'inventory_stock_id' && value && !isTemplate) {
          const stockItem = inventoryStock.find(item => item.id === value);
          if (stockItem) {
            updated.ingredient_name = stockItem.item;
            updated.cost_per_unit = stockItem.cost || 0;
            updated.unit = stockItem.unit || 'g';
          }
        }

        if (field === 'inventory_stock_id' && value) {
          const storeItem = inventoryStock.find(item => item.id === value);
          if (storeItem) {
            updated.ingredient_name = storeItem.item;
            updated.cost_per_unit = storeItem.cost || 0;
            updated.unit = storeItem.unit;
          }
        }

        return updated;
      }
      return ingredient;
    });

    onChange(updatedIngredients);
  };

  const removeIngredient = (ingredientId: string) => {
    const updatedIngredients = ingredients.filter(ingredient => ingredient.id !== ingredientId);
    onChange(updatedIngredients);
  };

  const moveIngredientToGroup = (ingredientId: string, targetGroupId: string) => {
    const targetGroup = ingredientGroups.find(g => g.id === targetGroupId);
    
    const updatedIngredients = ingredients.map(ingredient => {
      if (ingredient.id === ingredientId) {
        return {
          ...ingredient,
          ingredient_group_id: targetGroupId === 'ungrouped' ? undefined : targetGroupId,
          ingredient_group_name: targetGroupId === 'ungrouped' ? undefined : targetGroup?.name,
          group_selection_type: targetGroupId === 'ungrouped' ? undefined : targetGroup?.type,
          is_optional: targetGroup?.type === 'optional_one'
        };
      }
      return ingredient;
    });

    onChange(updatedIngredients);
  };

  const toggleGroupCollapse = (groupId: string) => {
    setIngredientGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, isCollapsed: !group.isCollapsed }
        : group
    ));
  };

  const deleteGroup = (groupId: string) => {
    if (groupId === 'ungrouped') return;

    // Move all ingredients from this group to ungrouped
    const updatedIngredients = ingredients.map(ingredient => {
      if (ingredient.ingredient_group_id === groupId) {
        return {
          ...ingredient,
          ingredient_group_id: undefined,
          ingredient_group_name: undefined,
          group_selection_type: undefined,
          is_optional: false
        };
      }
      return ingredient;
    });

    onChange(updatedIngredients);
    toast.success('Group deleted and ingredients moved to individual');
  };

  const getGroupStatusIcon = (group: IngredientGroup) => {
    if (group.type === 'required_one') {
      return <AlertCircle className="h-4 w-4 text-orange-500" />;
    } else if (group.type === 'optional_one') {
      return <CheckCircle2 className="h-4 w-4 text-blue-500" />;
    }
    return <Users className="h-4 w-4 text-green-500" />;
  };

  const getGroupTypeLabel = (type: string) => {
    switch (type) {
      case 'required_one': return 'Choose 1 (Required)';
      case 'optional_one': return 'Choose 1 (Optional)';
      case 'multiple': return 'Multiple Selection';
      default: return type;
    }
  };

  const availableItems = inventoryStock;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recipe Ingredients
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setShowGroupDialog(true)}
            >
              <Settings className="h-4 w-4 mr-1" />
              Create Group
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Group Creation Dialog */}
        <IngredientGroupDialog
          isOpen={showGroupDialog}
          onClose={() => setShowGroupDialog(false)}
          onCreateGroup={handleCreateGroup}
          existingGroups={ingredientGroups.map(g => ({
            id: g.id,
            name: g.name,
            selectionType: g.type,
            isOptional: g.type === 'optional_one',
            displayOrder: 0
          }))}
        />

        {/* Ingredient Groups */}
        <div className="space-y-4">
          {ingredientGroups.map((group) => (
            <Collapsible
              key={group.id}
              open={!group.isCollapsed}
              onOpenChange={() => toggleGroupCollapse(group.id)}
            >
              <Card className="overflow-visible">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {group.isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          {getGroupStatusIcon(group)}
                        </div>
                        <div>
                          <CardTitle className="text-base">{group.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {getGroupTypeLabel(group.type)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {group.ingredients.length} ingredient{group.ingredients.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            addIngredientToGroup(group.id);
                          }}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Ingredient
                        </Button>
                        {group.id !== 'ungrouped' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGroup(group.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {group.ingredients.map((ingredient) => (
                        <div key={ingredient.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg bg-muted/25">
                          <div className="col-span-1 flex items-center justify-center">
                            <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                          </div>
                          
                          <div className="col-span-3">
                            <Label className="text-xs">Store Inventory Item</Label>
                            <Select
                              value={ingredient.inventory_stock_id || ''}
                              onValueChange={(value) => updateIngredient(ingredient.id, 'inventory_stock_id', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select item" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableItems
                                  .filter(item => item.id && item.id.trim() !== '' && (item.item || item.name) && (item.item || item.name).trim() !== '')
                                  .map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.item || item.name} ({item.unit})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={ingredient.ingredient_name || ''}
                              onChange={(e) => updateIngredient(ingredient.id, 'ingredient_name', e.target.value)}
                              placeholder="Ingredient name"
                            />
                          </div>

                          <div className="col-span-1">
                            <Label className="text-xs">Quantity</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.1"
                              value={ingredient.quantity || 0}
                              onChange={(e) => updateIngredient(ingredient.id, 'quantity', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Unit</Label>
                            <Select
                              value={ingredient.unit || 'g'}
                              onValueChange={(value) => updateIngredient(ingredient.id, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="kg">kg</SelectItem>
                                <SelectItem value="g">g</SelectItem>
                                <SelectItem value="pieces">pieces</SelectItem>
                                <SelectItem value="liters">liters</SelectItem>
                                <SelectItem value="ml">ml</SelectItem>
                                <SelectItem value="boxes">boxes</SelectItem>
                                <SelectItem value="packs">packs</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="col-span-2">
                            <Label className="text-xs">Cost per Unit</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={ingredient.cost_per_unit || 0}
                              onChange={(e) => updateIngredient(ingredient.id, 'cost_per_unit', parseFloat(e.target.value) || 0)}
                            />
                          </div>

                          <div className="col-span-1 flex gap-1">
                            <Select
                              value={ingredient.ingredient_group_id || 'ungrouped'}
                              onValueChange={(value) => moveIngredientToGroup(ingredient.id, value)}
                            >
                              <SelectTrigger className="w-8 h-8 p-0">
                                <Users className="h-3 w-3" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ungrouped">Individual</SelectItem>
                                {ingredientGroups
                                  .filter(g => g.id !== 'ungrouped')
                                  .map(g => (
                                    <SelectItem key={g.id} value={g.id}>
                                      {g.name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-8 h-8 p-0"
                              onClick={() => removeIngredient(ingredient.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {group.ingredients.length === 0 && (
                        <div className="text-center py-4 text-muted-foreground border-2 border-dashed rounded-lg">
                          <p className="text-sm">No ingredients in this group yet.</p>
                          <p className="text-xs">Click "Add Ingredient" to add items to this group.</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}

          {ingredientGroups.length === 0 && (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-gray-200 rounded-lg">
              <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p>No ingredient groups created yet.</p>
              <p className="text-sm">Create groups to organize ingredients with selection rules like "Choose 1 Topping".</p>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => addIngredientToGroup('ungrouped')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add First Ingredient
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}