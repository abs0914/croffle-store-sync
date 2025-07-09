import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Users, Settings, Search, DollarSign } from 'lucide-react';
import { RecipeTemplateIngredientInput } from '@/services/recipeManagement/types';
import { supabase } from '@/integrations/supabase/client';

interface IngredientFormRedesignedProps {
  ingredient: RecipeTemplateIngredientInput;
  index: number;
  onUpdate: (index: number, field: keyof RecipeTemplateIngredientInput, value: any) => void;
  onRemove: (index: number) => void;
  showLocationBadge?: boolean;
  locationColor?: string;
  onCreateGroup?: (groupName: string, selectionType: 'required_one' | 'optional_one' | 'multiple') => string;
  availableGroups?: Array<{id: string; name: string; type: 'required_one' | 'optional_one' | 'multiple'}>;
}

// Common ingredient suggestions for autocomplete
const COMMON_INGREDIENTS = [
  'All-purpose flour', 'Bread flour', 'Sugar', 'Brown sugar', 'Salt', 'Black pepper',
  'Butter', 'Olive oil', 'Vegetable oil', 'Eggs', 'Milk', 'Heavy cream',
  'Onion', 'Garlic', 'Tomato', 'Bell pepper', 'Chicken breast', 'Ground beef',
  'Rice', 'Pasta', 'Cheese', 'Mozzarella', 'Parmesan', 'Vanilla extract',
  'Baking powder', 'Baking soda', 'Yeast', 'Cocoa powder', 'Chocolate chips'
];

const UNIT_OPTIONS = [
  'kg', 'g', 'mg', 'liters', 'ml', 'cups', 'tbsp', 'tsp',
  'piece', 'pieces', 'serving', 'portion', 'pair', 'scoop',
  'boxes', 'packs', 'bottles', 'cans'
];

export const IngredientFormRedesigned: React.FC<IngredientFormRedesignedProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  showLocationBadge = false,
  locationColor = 'bg-gray-500',
  onCreateGroup,
  availableGroups = []
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState<'required_one' | 'optional_one' | 'multiple'>('required_one');
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Load ingredient suggestions from existing inventory items
  useEffect(() => {
    const loadIngredientSuggestions = async () => {
      try {
        const { data: inventoryItems } = await supabase
          .from('inventory_stock')
          .select('item')
          .eq('is_active', true)
          .order('item');

        const { data: commissaryItems } = await supabase
          .from('commissary_inventory')
          .select('name')
          .eq('is_active', true)
          .order('name');

        const existingItems = [
          ...(inventoryItems?.map(item => item.item) || []),
          ...(commissaryItems?.map(item => item.name) || [])
        ];

        // Combine with common ingredients and remove duplicates
        const allSuggestions = [...new Set([...COMMON_INGREDIENTS, ...existingItems])];
        setIngredientSuggestions(allSuggestions);
      } catch (error) {
        console.error('Error loading ingredient suggestions:', error);
        setIngredientSuggestions(COMMON_INGREDIENTS);
      }
    };

    loadIngredientSuggestions();
  }, []);

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

  const handleIngredientNameChange = (value: string) => {
    onUpdate(index, 'ingredient_name', value);
    setShowSuggestions(value.length > 0);
  };

  const selectSuggestion = (suggestion: string) => {
    onUpdate(index, 'ingredient_name', suggestion);
    setShowSuggestions(false);
  };

  const filteredSuggestions = ingredientSuggestions.filter(suggestion =>
    suggestion.toLowerCase().includes(ingredient.ingredient_name.toLowerCase())
  ).slice(0, 5);

  return (
    <div className="relative">
      {/* Main Card */}
      <div className="p-6 border border-border rounded-lg bg-card relative">
        {showLocationBadge && (
          <div className="absolute -top-2 -right-2">
            <div className={`w-4 h-4 rounded-full ${locationColor}`} />
          </div>
        )}
        
        {/* Ingredient Group Section */}
        <div className="space-y-4 mb-6 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ingredient Group (Optional)
              </Label>
              <Select 
                value={ingredient.ingredient_group_id || ''} 
                onValueChange={handleGroupChange}
              >
                <SelectTrigger className="mt-2">
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
              <Badge variant="secondary" className="ml-4 flex items-center gap-1">
                <Users className="h-3 w-3" />
                {ingredient.ingredient_group_name}
              </Badge>
            )}
          </div>

          {/* New Group Creation */}
          {showGroupSettings && (
            <div className="p-4 border border-border rounded-lg bg-muted/50">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="h-4 w-4" />
                <Label className="font-medium">Create New Ingredient Group</Label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Group Name</Label>
                  <Input
                    placeholder="e.g., Choose 1 Sauce"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Selection Type</Label>
                  <Select value={newGroupType} onValueChange={(value: any) => setNewGroupType(value)}>
                    <SelectTrigger className="mt-1">
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
              <div className="flex gap-2 mt-3">
                <Button type="button" size="sm" onClick={handleCreateNewGroup}>Create Group</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowGroupSettings(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </div>

        {/* Main Ingredient Form */}
        <div className="space-y-6">
          {/* Ingredient Name with Autocomplete */}
          <div className="relative">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Search className="h-4 w-4" />
              Ingredient Name
            </Label>
            <Input
              type="text"
              value={ingredient.ingredient_name}
              onChange={(e) => handleIngredientNameChange(e.target.value)}
              placeholder="Start typing ingredient name..."
              className="mt-2"
              onFocus={() => setShowSuggestions(ingredient.ingredient_name.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            
            {/* Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                {filteredSuggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground text-sm"
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quantity and Unit Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium">Quantity</Label>
              <Input
                type="number"
                min="0"
                step="0.1"
                value={ingredient.quantity}
                onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 0)}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label className="text-sm font-medium">Unit</Label>
              <Select
                value={ingredient.unit}
                onValueChange={(value) => onUpdate(index, 'unit', value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_OPTIONS.map(unit => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Estimated Cost */}
          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Estimated Cost per Unit (₱) - Optional
            </Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={ingredient.estimated_cost_per_unit || ''}
              onChange={(e) => onUpdate(index, 'estimated_cost_per_unit', parseFloat(e.target.value) || undefined)}
              placeholder="0.00"
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This helps with cost estimation. Actual costs will be determined when deploying to stores.
            </p>
          </div>

          {/* Preparation Notes */}
          <div>
            <Label className="text-sm font-medium">Preparation Notes (Optional)</Label>
            <Textarea
              value={ingredient.preparation_notes || ''}
              onChange={(e) => onUpdate(index, 'preparation_notes', e.target.value)}
              placeholder="Special preparation instructions, storage notes, or quality requirements..."
              className="mt-2 min-h-[80px]"
            />
          </div>
        </div>

        {/* Remove Button */}
        <div className="flex justify-end mt-6 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove Ingredient
          </Button>
        </div>
      </div>
    </div>
  );
};