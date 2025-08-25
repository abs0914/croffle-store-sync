import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface InventoryItem {
  id: string;
  item: string;
  unit: string;
  cost?: number;
  stock_quantity: number;
}

interface IngredientData {
  inventory_stock_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

interface InventoryBasedIngredientFormProps {
  ingredient: IngredientData;
  index: number;
  onUpdate: (index: number, ingredient: IngredientData) => void;
  onRemove: (index: number) => void;
  storeId?: string;
}

export const InventoryBasedIngredientForm: React.FC<InventoryBasedIngredientFormProps> = ({
  ingredient,
  index,
  onUpdate,
  onRemove,
  storeId
}) => {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInventoryItems();
  }, [storeId]);

  const loadInventoryItems = async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, cost, stock_quantity')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('item');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error loading inventory items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInventoryItemSelect = (inventoryId: string) => {
    const item = inventoryItems.find(inv => inv.id === inventoryId);
    if (item) {
      onUpdate(index, {
        ...ingredient,
        inventory_stock_id: inventoryId,
        ingredient_name: item.item,
        unit: item.unit,
        cost_per_unit: item.cost || 0
      });
    }
  };

  const handleQuantityChange = (quantity: string) => {
    const numQuantity = parseFloat(quantity) || 0;
    onUpdate(index, { ...ingredient, quantity: numQuantity });
  };

  const handleCostChange = (cost: string) => {
    const numCost = parseFloat(cost) || 0;
    onUpdate(index, { ...ingredient, cost_per_unit: numCost });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse">Loading inventory items...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Ingredient {index + 1}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inventory Item Selection */}
        <div>
          <Label>Inventory Item</Label>
          <Select
            value={ingredient.inventory_stock_id}
            onValueChange={handleInventoryItemSelect}
          >
            <SelectTrigger className="bg-background border border-input">
              <SelectValue 
                placeholder="Select inventory item..."
              >
                {ingredient.ingredient_name || "Select inventory item..."}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover border border-border shadow-md z-50">
              {inventoryItems.map((item) => (
                <SelectItem key={item.id} value={item.id} className="hover:bg-accent">
                  <div className="flex justify-between items-center w-full">
                    <span>{item.item}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {item.unit} | Stock: {item.stock_quantity}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity Input */}
        <div>
          <Label>Quantity</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              step="0.01"
              value={ingredient.quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              placeholder="0.00"
            />
            <div className="flex items-center px-3 py-2 bg-muted rounded-md min-w-[80px] text-sm">
              {ingredient.unit || 'Unit'}
            </div>
          </div>
        </div>

        {/* Cost per Unit */}
        <div>
          <Label>Cost per Unit</Label>
          <Input
            type="number"
            step="0.01"
            value={ingredient.cost_per_unit}
            onChange={(e) => handleCostChange(e.target.value)}
            placeholder="0.00"
          />
        </div>

        {/* Total Cost Display */}
        {ingredient.quantity > 0 && ingredient.cost_per_unit > 0 && (
          <div className="pt-2 border-t">
            <div className="flex justify-between text-sm">
              <span>Total Cost:</span>
              <span className="font-medium">
                ₱{(ingredient.quantity * ingredient.cost_per_unit).toFixed(2)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};