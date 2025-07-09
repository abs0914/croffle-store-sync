
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Users, Settings } from 'lucide-react';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
import { supabase } from '@/integrations/supabase/client';

interface IngredientFormProps {
  ingredient: RecipeTemplateIngredientInput;
  index: number;
  onUpdate: (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => void;
  onRemove: (index: number) => void;
  showLocationBadge?: boolean;
  locationColor?: string;
  onCreateGroup?: (groupName: string, selectionType: 'required_one' | 'optional_one' | 'multiple') => string;
  availableGroups?: Array<{id: string; name: string; type: 'required_one' | 'optional_one' | 'multiple'}>;
}

export const IngredientForm: React.FC<IngredientFormProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  showLocationBadge = false,
  locationColor = 'bg-gray-500',
  onCreateGroup,
  availableGroups = []
}) => {
  const [storeInventoryItems, setStoreInventoryItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'required_one' | 'optional_one' | 'multiple'>('required_one');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load store inventory items only
        const { data: storeItems } = await supabase
          .from('inventory_stock')
          .select('id, item, unit, cost, store_id')
          .eq('is_active', true)
          .order('item');

        setStoreInventoryItems(storeItems || []);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleStoreInventoryChange = (value: string) => {
    const selectedStoreItem = storeInventoryItems.find(item => item.id === value);
    if (selectedStoreItem) {
      onUpdate(index, 'inventory_stock_id', value);
      onUpdate(index, 'ingredient_name', selectedStoreItem.item);
      onUpdate(index, 'store_unit', selectedStoreItem.unit);
      onUpdate(index, 'cost_per_unit', selectedStoreItem.cost || 0);
    }
  };

  const handleCreateNewGroup = () => {
    if (!newGroupName.trim() || !onCreateGroup) return;
    
    const groupId = onCreateGroup(newGroupName.trim(), newGroupType);
    onUpdate(index, 'ingredient_group_id', groupId);
    onUpdate(index, 'ingredient_group_name', newGroupName.trim());
    onUpdate(index, 'group_selection_type', newGroupType);
    onUpdate(index, 'is_optional', newGroupType === 'optional_one');
    
    setNewGroupName('');
    setShowGroupSettings(false);
  };

  const handleGroupChange = (groupId: string) => {
    if (groupId === 'new') {
      setShowGroupSettings(true);
      return;
    }
    
    if (groupId === '') {
      // Remove from group
      onUpdate(index, 'ingredient_group_id', undefined);
      onUpdate(index, 'ingredient_group_name', undefined);
      onUpdate(index, 'group_selection_type', undefined);
      onUpdate(index, 'is_optional', false);
      return;
    }
    
    const group = availableGroups.find(g => g.id === groupId);
    if (group) {
      onUpdate(index, 'ingredient_group_id', groupId);
      onUpdate(index, 'ingredient_group_name', group.name);
      onUpdate(index, 'group_selection_type', group.type);
      onUpdate(index, 'is_optional', group.type === 'optional_one');
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg relative bg-card">
      {showLocationBadge && (
        <div className="absolute -top-2 -right-2">
          <div className={`w-4 h-4 rounded-full ${locationColor}`} />
        </div>
      )}
      
      {/* Ingredient Group Selection */}
      <div className="flex items-center gap-4 pb-3 border-b">
        <div className="flex-1">
          <Label className="text-sm font-medium">Ingredient Group</Label>
          <Select 
            value={ingredient.ingredient_group_id || ''} 
            onValueChange={handleGroupChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="No group (individual ingredient)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No group</SelectItem>
              {availableGroups.map(group => (
                <SelectItem key={group.id} value={group.id}>
                  <div className="flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    <span>{group.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.type.replace('_', ' ')}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
              <SelectItem value="new">
                <div className="flex items-center gap-2">
                  <Settings className="h-3 w-3" />
                  <span>Create New Group...</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {ingredient.ingredient_group_name && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {ingredient.ingredient_group_name}
          </Badge>
        )}
      </div>

      {/* New Group Creation */}
      {showGroupSettings && (
        <div className="space-y-3 p-3 border rounded bg-muted/50">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <Label className="font-medium">Create New Ingredient Group</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Group Name</Label>
              <Input
                placeholder="e.g., Choose 1 Sauce"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Selection Type</Label>
              <Select value={newGroupType} onValueChange={(value: any) => setNewGroupType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="required_one">Choose 1 (Required)</SelectItem>
                  <SelectItem value="optional_one">Choose 1 (Optional)</SelectItem>
                  <SelectItem value="multiple">Choose Multiple</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCreateNewGroup}>Create Group</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowGroupSettings(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Main ingredient form - Store Inventory Only */}
      <div className="grid gap-2 items-end grid-cols-6">
        <div>
          <Label>Store Inventory Item</Label>
          {isLoading ? (
            <Input
              value={ingredient.ingredient_name}
              onChange={(e) => onUpdate(index, 'ingredient_name', e.target.value)}
              placeholder="Loading store inventory..."
              disabled
            />
          ) : (
            <Select
              value={ingredient.inventory_stock_id || ''}
              onValueChange={handleStoreInventoryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select store inventory item" />
              </SelectTrigger>
              <SelectContent>
                {storeInventoryItems.map(item => (
                  <SelectItem key={item.id} value={item.id}>
                    <div className="flex flex-col">
                      <span>{item.item}</span>
                      <span className="text-xs text-muted-foreground">
                        {item.unit} • ₱{item.cost?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div>
          <Label>Recipe Quantity</Label>
          <Input
            type="number"
            min="0"
            step="0.1"
            value={ingredient.quantity}
            onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
          />
          <div className="text-xs text-muted-foreground mt-1">
            Amount needed for recipe
          </div>
        </div>
        
        <div>
          <Label>Recipe Unit</Label>
          <Select
            value={ingredient.unit}
            onValueChange={(value) => onUpdate(index, 'unit', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kg">kg</SelectItem>
              <SelectItem value="g">g</SelectItem>
              <SelectItem value="piece">piece</SelectItem>
              <SelectItem value="pieces">pieces</SelectItem>
              <SelectItem value="serving">serving</SelectItem>
              <SelectItem value="portion">portion</SelectItem>
              <SelectItem value="pair">pair</SelectItem>
              <SelectItem value="scoop">scoop</SelectItem>
              <SelectItem value="liters">liters</SelectItem>
              <SelectItem value="ml">ml</SelectItem>
              <SelectItem value="cups">cups</SelectItem>
              <SelectItem value="tbsp">tbsp</SelectItem>
              <SelectItem value="tsp">tsp</SelectItem>
              <SelectItem value="boxes">boxes</SelectItem>
              <SelectItem value="packs">packs</SelectItem>
              <SelectItem value="Piping Bag">Piping Bag</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Conversion Factor</Label>
          <Input
            type="number"
            min="1"
            step="0.1"
            value={ingredient.recipe_to_store_conversion_factor || 1}
            onChange={(e) => onUpdate(index, 'recipe_to_store_conversion_factor', parseFloat(e.target.value) || 1)}
            placeholder="e.g., 20"
          />
          <div className="text-xs text-muted-foreground mt-1">
            How many {ingredient.unit}s per {ingredient.store_unit || 'store unit'}
          </div>
        </div>

        <div>
          <Label>Cost per Store Unit (₱)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={ingredient.cost_per_unit || 0}
            onChange={(e) => onUpdate(index, 'cost_per_unit', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            disabled
          />
          <div className="text-xs text-muted-foreground mt-1">
            Auto-filled from store inventory
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
