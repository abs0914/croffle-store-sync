import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash2, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventoryItem {
  id: string;
  item: string;
  unit: string;
  item_category: string;
  stock_quantity: number;
  cost: number;
}

interface IngredientData {
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface CategoryEnhancedIngredientFormProps {
  ingredient: IngredientData;
  index: number;
  onUpdate: (index: number, ingredient: IngredientData) => void;
  onRemove: (index: number) => void;
  storeId: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'base_ingredient': 'Base Ingredients',
  'sauce': 'Sauces & Dressings',
  'topping': 'Toppings',
  'side': 'Sides',
  'beverage': 'Beverages',
  'seasoning': 'Seasonings',
  'packaging': 'Packaging',
  'other': 'Other Items'
};

const getCategoryLabel = (category: string) => {
  return CATEGORY_LABELS[category] || category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const CategoryEnhancedIngredientForm: React.FC<CategoryEnhancedIngredientFormProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  storeId
}) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      loadInventoryItems();
    }
  }, [storeId]);

  const loadInventoryItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_inventory_items_by_category', {
        store_id_param: storeId
      });

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  // Group inventory items by category
  const groupedInventory = useMemo(() => {
    const groups: Record<string, InventoryItem[]> = {};
    
    inventoryItems.forEach(item => {
      const category = item.item_category || 'other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
    });

    return groups;
  }, [inventoryItems]);

  const handleInventoryItemSelect = (inventoryStockId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === inventoryStockId);
    if (selectedItem) {
      onUpdate(index, {
        ...ingredient,
        inventory_stock_id: inventoryStockId,
        ingredient_name: selectedItem.item,
        unit: selectedItem.unit,
        cost_per_unit: selectedItem.cost || 0
      });
    }
  };

  const handleQuantityChange = (quantity: number) => {
    onUpdate(index, {
      ...ingredient,
      quantity
    });
  };

  const handleCostChange = (cost_per_unit: number) => {
    onUpdate(index, {
      ...ingredient,
      cost_per_unit
    });
  };

  const totalCost = ingredient.quantity * ingredient.cost_per_unit;
  const selectedItem = inventoryItems.find(item => item.id === ingredient.inventory_stock_id);

  if (loading && !ingredient.ingredient_name) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Package className="h-4 w-4 animate-pulse" />
            Loading inventory items...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Ingredient {index + 1}
            {selectedItem && (
              <Badge variant="outline" className="text-xs">
                {getCategoryLabel(selectedItem.item_category)}
              </Badge>
            )}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Inventory Item Selection */}
        <div className="space-y-2">
          <Label htmlFor={`ingredient-${index}`}>Select Ingredient</Label>
          <Select
            value={ingredient.inventory_stock_id}
            onValueChange={handleInventoryItemSelect}
          >
            <SelectTrigger>
              <SelectValue 
                placeholder="Choose an ingredient..."
              >
                {ingredient.ingredient_name || undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60">
              {loading ? (
                <div className="p-2 text-center text-muted-foreground">
                  Loading inventory items...
                </div>
              ) : Object.entries(groupedInventory).length > 0 ? (
                Object.entries(groupedInventory).map(([category, items]) => (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                      {getCategoryLabel(category)}
                    </div>
                    
                    {/* Category Items */}
                    {items.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{item.item}</span>
                            <Badge variant="outline" className="text-xs">
                              {item.unit}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Stock: {item.stock_quantity} • ₱{item.cost?.toFixed(2) || '0.00'}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))
              ) : (
                <div className="p-2 text-center text-muted-foreground">
                  No inventory items found
                </div>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity and Cost */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`quantity-${index}`}>Quantity</Label>
            <Input
              id={`quantity-${index}`}
              type="number"
              step="0.01"
              min="0"
              value={ingredient.quantity || ''}
              onChange={(e) => handleQuantityChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`cost-${index}`}>Cost per {ingredient.unit || 'Unit'}</Label>
            <Input
              id={`cost-${index}`}
              type="number"
              step="0.01"
              min="0"
              value={ingredient.cost_per_unit || ''}
              onChange={(e) => handleCostChange(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Total Cost Display */}
        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Total Cost:</span>
          <span className="text-lg font-semibold">₱{totalCost.toFixed(2)}</span>
        </div>

        {/* Stock Warning */}
        {selectedItem && selectedItem.stock_quantity < ingredient.quantity && (
          <div className="p-2 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-xs text-amber-800">
              ⚠️ Insufficient stock! Available: {selectedItem.stock_quantity} {selectedItem.unit}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};